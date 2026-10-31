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

  // Single atomic statement (no interactive transaction) so the ApiKey row
  // lock is held only for this statement — see settlePackageTokens.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH reserved AS (
      UPDATE public."ApiKey"
      SET "tokenUsed" = "tokenUsed" + ${reservedTokens}, "updatedAt" = NOW()
      WHERE "id" = ${apiKeyId}
        AND "billingMode" = 'TOKEN_PACKAGE'
        AND "isActive" = true
        AND "enabled" = true
        AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
        AND "tokenUsed" + ${reservedTokens} <= "tokenQuota"
      RETURNING "id"
    )
    INSERT INTO public."TokenReservation"
      ("id", "requestId", "apiKeyId", "reservedTokens", "consumedTokens", "releasedTokens", "status", "createdAt")
    SELECT ${randomUUID()}, ${requestId}, r."id", ${reservedTokens}, 0, 0, 'RESERVED', NOW()
    FROM reserved r
    RETURNING "id"
  `;
  if (rows.length !== 1) return { ok: false as const };
  return { ok: true as const, id: rows[0].id, reservedTokens: Number(reservedTokens) };
}

export async function releasePackageTokens(reservationId: string) {
  // Single atomic statement (no interactive transaction) — see settlePackageTokens.
  const updated = await prisma.$executeRaw`
    WITH released AS (
      UPDATE public."TokenReservation"
      SET "status" = 'RELEASED', "releasedTokens" = "reservedTokens", "settledAt" = NOW()
      WHERE "id" = ${reservationId} AND "status" = 'RESERVED'
      RETURNING "apiKeyId", "reservedTokens"
    )
    UPDATE public."ApiKey" k
    SET "tokenUsed" = k."tokenUsed" - r."reservedTokens", "updatedAt" = NOW()
    FROM released r
    WHERE k."id" = r."apiKeyId"
  `;
  return updated === 1;
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

  const actual = BigInt(totalTokens);
  let key: { tokenQuota: bigint; tokenUsed: bigint; expiresAt: Date | null };
  try {
    // Claim the reservation and adjust the key in ONE statement. The previous
    // interactive transaction took ~5 round-trips while holding the ApiKey row
    // lock; with many parallel streams on the same key (and a tiny pool) the
    // settles queued on that lock, blew the 5s tx timeout and starved the pool
    // (P2028) for every other request. A single statement is atomic on its own,
    // holds the lock only for its own duration and needs no interactive tx.
    // Refund when usage is below the reservation; when vendor usage exceeds it,
    // charge the overage without ever crossing tokenQuota.
    const rows = await prisma.$queryRaw<{ tokenQuota: bigint; tokenUsed: bigint; expiresAt: Date | null }[]>`
      WITH claimed AS (
        UPDATE public."TokenReservation"
        SET "status" = 'SETTLED',
            "consumedTokens" = ${actual}::bigint,
            "releasedTokens" = GREATEST("reservedTokens" - ${actual}::bigint, 0),
            "settledAt" = NOW()
        WHERE "id" = ${params.reservationId} AND "status" = 'RESERVED'
        RETURNING "reservedTokens"
      )
      UPDATE public."ApiKey" k
      SET "tokenUsed" = CASE
            WHEN ${actual}::bigint > c."reservedTokens"
              THEN LEAST(k."tokenQuota", k."tokenUsed" + (${actual}::bigint - c."reservedTokens"))
            ELSE k."tokenUsed" - (c."reservedTokens" - ${actual}::bigint)
          END,
          "requestCount" = k."requestCount" + 1,
          "requestToday" = k."requestToday" + 1,
          "lastRequestAt" = NOW(),
          "updatedAt" = NOW()
      FROM claimed c
      WHERE k."id" = ${params.apiKeyId}
      RETURNING k."tokenQuota", k."tokenUsed", k."expiresAt"
    `;
    if (rows.length !== 1) return { ok: false, error: "Reservation sudah diproses" };
    key = rows[0];
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Settlement gagal" };
  }
  const remaining = key.tokenQuota - key.tokenUsed;

  // Usage/audit logs are written after the quota is settled and outside any
  // lock: a log failure must not undo or block the billing itself.
  try {
    await prisma.$transaction([
      prisma.usageLog.create({
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
      }),
      prisma.apiRequestLog.create({
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
      }),
    ]);
  } catch (error) {
    console.error(
      `[package-billing] settle OK tapi gagal tulis log reservation=${params.reservationId}:`,
      error instanceof Error ? error.message : error,
    );
  }

  return {
    ok: true,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      remainingTokens: Number(remaining > 0 ? remaining : 0n),
      expiresAt: key.expiresAt?.toISOString() ?? null,
    },
  };
}
