import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import type { RequestMeta } from "./wallet";

type PackageBillableModel = {
  modelId: string;
  provider: string;
};

export type PackageUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  remainingTokens: number;
  expiresAt: string | null;
};

export async function reservePackageTokens(apiKeyId: string, amount: number) {
  const reservedTokens = BigInt(Math.max(1, Math.ceil(amount)));
  const requestId = randomUUID();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.$executeRaw`
      UPDATE "ApiKey"
      SET "tokenUsed" = "tokenUsed" + ${reservedTokens}, "updatedAt" = NOW()
      WHERE "id" = ${apiKeyId}
        AND "billingMode" = 'TOKEN_PACKAGE'
        AND "isActive" = true
        AND "enabled" = true
        AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
        AND "tokenUsed" + ${reservedTokens} <= "tokenQuota"
    `;
    if (updated !== 1) return { ok: false as const };

    const reservation = await tx.tokenReservation.create({
      data: { requestId, apiKeyId, reservedTokens },
    });
    return { ok: true as const, id: reservation.id, reservedTokens: Number(reservedTokens) };
  });
}

export async function releasePackageTokens(reservationId: string) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.tokenReservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.status !== "RESERVED") return false;

    const claimed = await tx.tokenReservation.updateMany({
      where: { id: reservationId, status: "RESERVED" },
      data: {
        status: "RELEASED",
        releasedTokens: reservation.reservedTokens,
        settledAt: new Date(),
      },
    });
    if (claimed.count !== 1) return false;
    await tx.apiKey.update({
      where: { id: reservation.apiKeyId },
      data: { tokenUsed: { decrement: reservation.reservedTokens } },
    });
    return true;
  });
}

export async function settlePackageTokens(params: {
  reservationId: string;
  apiKeyId: string;
  userId: string;
  resolvedModel: PackageBillableModel;
  inputTokens: number;
  outputTokens: number;
  requestMeta: RequestMeta;
}): Promise<{ ok: true; usage: PackageUsage } | { ok: false; error: string }> {
  const inputTokens = Math.max(0, Math.floor(params.inputTokens));
  const outputTokens = Math.max(0, Math.floor(params.outputTokens));
  const totalTokens = inputTokens + outputTokens;

  try {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.tokenReservation.findUnique({ where: { id: params.reservationId } });
      if (!reservation || reservation.status !== "RESERVED") {
        return { ok: false as const, error: "Reservation sudah diproses" };
      }

      const actual = BigInt(Math.min(totalTokens, Number(reservation.reservedTokens)));
      const refund = reservation.reservedTokens - actual;
      const claimed = await tx.tokenReservation.updateMany({
        where: { id: reservation.id, status: "RESERVED" },
        data: {
          status: "SETTLED",
          consumedTokens: actual,
          releasedTokens: refund,
          settledAt: new Date(),
        },
      });
      if (claimed.count !== 1) return { ok: false as const, error: "Settlement bersamaan terdeteksi" };

      const key = await tx.apiKey.update({
        where: { id: params.apiKeyId },
        data: {
          tokenUsed: { decrement: refund },
          requestCount: { increment: 1 },
          requestToday: { increment: 1 },
          lastRequestAt: new Date(),
        },
      });
      const remaining = key.tokenQuota - key.tokenUsed;

      await tx.usageLog.create({
        data: {
          apiKeyId: params.apiKeyId,
          userId: params.userId,
          model: params.resolvedModel.modelId,
          provider: params.resolvedModel.provider,
          status: "success",
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          inputTokens,
          outputTokens,
          totalTokens,
          totalCost: 0,
          remainingBalance: 0,
        },
      });
      await tx.apiRequestLog.create({
        data: {
          apiKeyId: params.apiKeyId,
          userId: params.userId,
          provider: params.resolvedModel.provider,
          model: params.resolvedModel.modelId,
          endpoint: params.requestMeta.endpoint,
          method: params.requestMeta.method,
          inputTokens,
          outputTokens,
          totalTokens,
          totalCost: 0,
          remainingBalance: 0,
          responseTime: params.requestMeta.responseTime,
          statusCode: params.requestMeta.statusCode,
          success: true,
          clientIp: params.requestMeta.clientIp,
          userAgent: params.requestMeta.userAgent,
        },
      });

      return {
        ok: true as const,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          remainingTokens: Number(remaining > 0 ? remaining : 0n),
          expiresAt: key.expiresAt?.toISOString() ?? null,
        },
      };
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Settlement gagal" };
  }
}
