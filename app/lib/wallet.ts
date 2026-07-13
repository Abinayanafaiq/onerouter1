import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { buildApiRequestLogData } from "./api-request-log";

/**
 * Optional request metadata captured for the ApiRequestLog audit record. When
 * supplied to chargeUsage/logNonBilledUsage, an ApiRequestLog row is created in
 * the same transaction as the wallet deduction and usage log.
 */
export type RequestMeta = {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  clientIp: string | null;
  userAgent: string | null;
};

export const WALLET_TX_TYPES = {
  TOPUP: "TOPUP",
  USAGE: "USAGE",
  REFUND: "REFUND",
  ADMIN_ADD: "ADMIN_ADD",
  ADMIN_DEDUCT: "ADMIN_DEDUCT",
  RESERVE: "RESERVE",
  RELEASE: "RELEASE",
} as const;

export type WalletTxType = (typeof WALLET_TX_TYPES)[keyof typeof WALLET_TX_TYPES];

export async function getOrCreateWallet(userId: string) {
  // Use upsert to avoid a race when multiple concurrent requests (layout,
  // page, and credit badge all run on the same navigation) try to create the
  // wallet at once — which would violate the unique constraint on userId.
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0 },
  });
}

export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return 0;
  return Number(wallet.balance);
}

export type TopUpResult =
  | { ok: true; newBalance: number }
  | { ok: false; error: string };

export async function topUpWallet(params: {
  userId: string;
  amount: number;
  type?: WalletTxType;
  description?: string;
}): Promise<TopUpResult> {
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be positive" };
  }

  const wallet = await getOrCreateWallet(params.userId);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: params.type || WALLET_TX_TYPES.TOPUP,
        amount: amount,
        description: params.description || "Top up wallet",
      },
    });

    return updated;
  });

  return { ok: true, newBalance: Number(result.balance) };
}

export type DeductResult =
  | { ok: true; newBalance: number; totalCost: number }
  | { ok: false; error: string };

export async function deductBalance(params: {
  userId: string;
  totalCost: number;
  description: string;
}): Promise<DeductResult> {
  const cost = Number(params.totalCost);
  if (!Number.isFinite(cost) || cost < 0) {
    return { ok: false, error: "Invalid cost" };
  }
  if (cost === 0) {
    const w = await getOrCreateWallet(params.userId);
    return { ok: true, newBalance: Number(w.balance), totalCost: 0 };
  }

  const wallet = await getOrCreateWallet(params.userId);
  const costDecimal = new Prisma.Decimal(cost).toDecimalPlaces(6);

  const result = await prisma.$transaction(async (tx) => {
    // Atomic conditional update: only succeeds if balance >= cost
    // This prevents race conditions — PostgreSQL handles the row lock
    const updateResult = await tx.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: costDecimal } },
      data: { balance: { decrement: costDecimal } },
    });

    if (updateResult.count === 0) {
      // Check if it's because of insufficient balance or wallet not found
      const current = await tx.wallet.findUnique({ where: { id: wallet.id } });
      if (!current) throw new Error("Wallet not found");
      throw new Error("Insufficient balance");
    }

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WALLET_TX_TYPES.USAGE,
        amount: costDecimal,
        description: params.description,
      },
    });

    const updated = await tx.wallet.findUnique({ where: { id: wallet.id } });
    return updated;
  });

  return {
    ok: true,
    newBalance: Number(result?.balance ?? 0),
    totalCost: cost,
  };
}

export type ChargeUsageResult =
  | {
      ok: true;
      newBalance: number;
      inputCost: number;
      outputCost: number;
      totalCost: number;
    }
  | { ok: false; error: string };

export async function chargeUsage(params: {
  userId: string;
  apiKeyId: string;
  aiModelId: string;
  modelLabel: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  requestMeta?: RequestMeta;
}): Promise<ChargeUsageResult> {
  const {
    userId,
    apiKeyId,
    aiModelId,
    modelLabel,
    provider = "unknown",
    inputTokens,
    outputTokens,
    inputPricePerMillion,
    outputPricePerMillion,
    requestMeta,
  } = params;

  const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion;
  const totalCost = inputCost + outputCost;

  if (totalCost <= 0) {
    // Still log usage but don't deduct
    const balance = await getWalletBalance(userId);
    await prisma.$transaction(async (tx) => {
      await tx.usageLog.create({
        data: {
          apiKeyId,
          userId,
          modelId: aiModelId,
          model: modelLabel,
          provider,
          status: "success",
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
          inputTokens,
          outputTokens,
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
          remainingBalance: new Prisma.Decimal(balance).toDecimalPlaces(4),
        },
      });
      if (requestMeta) {
        await tx.apiRequestLog.create({
          data: buildApiRequestLogData({
            apiKeyId,
            userId,
            provider,
            model: modelLabel,
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            remainingBalance: balance,
            success: true,
            ...requestMeta,
          }),
        });
      }
    });
    return { ok: true, newBalance: balance, inputCost: 0, outputCost: 0, totalCost: 0 };
  }

  const wallet = await getOrCreateWallet(userId);
  const totalCostDecimal = new Prisma.Decimal(totalCost).toDecimalPlaces(6);
  const inputCostDecimal = new Prisma.Decimal(inputCost).toDecimalPlaces(6);
  const outputCostDecimal = new Prisma.Decimal(outputCost).toDecimalPlaces(6);

  const result = await prisma.$transaction(async (tx) => {
    // Atomic conditional update: only deduct if balance is sufficient.
    // This is the authoritative server-side guard against overspend and
    // handles concurrent requests via the row-level lock in PostgreSQL.
    const updateResult = await tx.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: totalCostDecimal } },
      data: { balance: { decrement: totalCostDecimal } },
    });

    if (updateResult.count === 0) {
      throw new Error("Insufficient balance");
    }

    const updated = await tx.wallet.findUnique({ where: { id: wallet.id } });
    const remaining = new Prisma.Decimal(updated?.balance ?? 0).toDecimalPlaces(4);

    // Save usage log
    await tx.usageLog.create({
      data: {
        apiKeyId,
        userId,
        modelId: aiModelId,
        model: modelLabel,
        provider,
        status: "success",
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        inputTokens,
        outputTokens,
        inputCost: inputCostDecimal,
        outputCost: outputCostDecimal,
        totalCost: totalCostDecimal,
        remainingBalance: remaining,
      },
    });

    // Save wallet transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WALLET_TX_TYPES.USAGE,
        amount: totalCostDecimal,
        description: `AI usage: ${modelLabel} (${inputTokens} in / ${outputTokens} out)`,
      },
    });

    // Save detailed API request log (audit / analytics) in the same tx.
    if (requestMeta) {
      await tx.apiRequestLog.create({
        data: buildApiRequestLogData({
          apiKeyId,
          userId,
          provider,
          model: modelLabel,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          inputCost,
          outputCost,
          totalCost,
          remainingBalance: Number(remaining),
          success: true,
          ...requestMeta,
        }),
      });
    }

    return updated;
  }).catch((e: Error) => {
    return { error: e.message } as { error: string };
  });

  if (result && "error" in result) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    newBalance: Number(result?.balance ?? 0),
    inputCost,
    outputCost,
    totalCost,
  };
}

/**
 * Log a request that did not result in a successful charge (rejected for
 * insufficient balance, or an upstream error). Records zero cost so the
 * activity history reflects the attempt without deducting credit.
 */
export async function logNonBilledUsage(params: {
  userId: string;
  apiKeyId: string;
  aiModelId: string;
  modelLabel: string;
  provider?: string;
  status: "rejected" | "error";
  requestMeta?: RequestMeta;
}): Promise<void> {
  const { userId, apiKeyId, aiModelId, modelLabel, provider = "unknown", status, requestMeta } = params;
  try {
    const balance = await getWalletBalance(userId);
    await prisma.$transaction(async (tx) => {
      await tx.usageLog.create({
        data: {
          apiKeyId,
          userId,
          modelId: aiModelId,
          model: modelLabel,
          provider,
          status,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
          remainingBalance: new Prisma.Decimal(balance).toDecimalPlaces(4),
        },
      });
      if (requestMeta) {
        await tx.apiRequestLog.create({
          data: buildApiRequestLogData({
            apiKeyId,
            userId,
            provider,
            model: modelLabel,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            remainingBalance: balance,
            success: false,
            ...requestMeta,
          }),
        });
      }
    });
  } catch (e) {
    console.error("[logNonBilledUsage] failed:", e);
  }
}

export async function adminAdjustBalance(params: {
  userId: string;
  amount: number;
  description: string;
}): Promise<TopUpResult> {
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "Amount must be non-zero" };
  }

  const wallet = await getOrCreateWallet(params.userId);
  const absAmount = Math.abs(amount);
  const isAdd = amount > 0;

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (isAdd) {
        const updated = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: absAmount } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WALLET_TX_TYPES.ADMIN_ADD,
            amount: absAmount,
            description: params.description,
          },
        });
        return updated;
      } else {
        // For deduction, use conditional update to prevent negative balance
        const updateResult = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: { gte: absAmount } },
          data: { balance: { decrement: absAmount } },
        });
        if (updateResult.count === 0) {
          throw new Error("Insufficient balance for deduction");
        }
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WALLET_TX_TYPES.ADMIN_DEDUCT,
            amount: absAmount,
            description: params.description,
          },
        });
        return await tx.wallet.findUnique({ where: { id: wallet.id } });
      }
    });

    return { ok: true, newBalance: Number(result?.balance ?? 0) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getTransactions(walletId: string, take = 50) {
  return prisma.walletTransaction.findMany({
    where: { walletId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/* ============================================================
   Credit Reservation System
   ------------------------------------------------------------
   Prevents the TOCTOU race where a balance check passes but
   the actual charge (after the upstream provider responds)
   fails because concurrent requests drained the wallet in
   between.

   Flow:
     1. reserveCredits  — atomically deduct estimated max cost
     2. call upstream provider
     3a. settleUsage    — refund difference, log actual cost
     3b. releaseReservation — full refund on upstream failure
   ============================================================ */

export type ReserveResult =
  | {
      ok: true;
      walletId: string;
      reservedAmount: number;
      newBalance: number;
    }
  | { ok: false; error: string; currentBalance: number };

/**
 * Atomically deduct a reservation amount from the wallet. This holds the
 * credits so concurrent requests cannot overspend. Uses a conditional
 * `updateMany` (balance >= amount) which is concurrency-safe via
 * PostgreSQL row-level locking.
 *
 * Returns the wallet ID and post-reservation balance on success, or the
 * current balance on failure so the caller can log it.
 */
export async function reserveCredits(params: {
  userId: string;
  amount: number;
  description: string;
}): Promise<ReserveResult> {
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    const current = await getWalletBalance(params.userId);
    return { ok: false, error: "Invalid reservation amount", currentBalance: current };
  }

  // A zero-cost reservation is a no-op (e.g. free-tier model). Still succeed
  // so the caller can proceed without contacting the provider's billing.
  if (amount === 0) {
    const wallet = await getOrCreateWallet(params.userId);
    return {
      ok: true,
      walletId: wallet.id,
      reservedAmount: 0,
      newBalance: Number(wallet.balance),
    };
  }

  const wallet = await getOrCreateWallet(params.userId);
  const reserveDecimal = new Prisma.Decimal(amount).toDecimalPlaces(6);

  const result = await prisma.$transaction(async (tx) => {
    // Atomic conditional decrement — only succeeds if balance >= amount.
    // PostgreSQL acquires a row-level lock for this UPDATE, making it
    // safe against concurrent reservations.
    const updateResult = await tx.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: reserveDecimal } },
      data: { balance: { decrement: reserveDecimal } },
    });

    if (updateResult.count === 0) {
      const current = await tx.wallet.findUnique({ where: { id: wallet.id } });
      return {
        error: "Insufficient balance" as const,
        currentBalance: Number(current?.balance ?? 0),
      };
    }

    const updated = await tx.wallet.findUnique({ where: { id: wallet.id } });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WALLET_TX_TYPES.RESERVE,
        amount: reserveDecimal,
        description: params.description,
      },
    });

    return { updated };
  });

  if ("error" in result) {
    return { ok: false, error: result.error as string, currentBalance: result.currentBalance as number };
  }

  return {
    ok: true,
    walletId: wallet.id,
    reservedAmount: amount,
    newBalance: Number(result.updated?.balance ?? 0),
  };
}

export type SettleResult =
  | {
      ok: true;
      finalBalance: number;
      actualCost: number;
      refunded: number;
      inputCost: number;
      outputCost: number;
    }
  | { ok: false; error: string };

/**
 * Settle a reservation against the actual usage from the upstream provider.
 *
 * - If actualCost < reservedAmount: refund the difference (REFUND tx).
 * - If actualCost > reservedAmount: attempt to deduct the extra (best-effort;
 *   if the remaining balance can't cover it, the cost is absorbed — the
 *   reservation should be generous enough to make this rare).
 * - Always creates a UsageLog and (if requestMeta provided) an ApiRequestLog
 *   with the real token counts and costs.
 *
 * All operations are in a single transaction.
 */
export async function settleUsage(params: {
  userId: string;
  apiKeyId: string;
  walletId: string;
  reservedAmount: number;
  aiModelId: string;
  modelLabel: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  requestMeta?: RequestMeta;
}): Promise<SettleResult> {
  const {
    userId,
    apiKeyId,
    walletId,
    reservedAmount,
    aiModelId,
    modelLabel,
    provider,
    inputTokens,
    outputTokens,
    inputPricePerMillion,
    outputPricePerMillion,
    requestMeta,
  } = params;

  const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion;
  const actualCost = inputCost + outputCost;

  const actualCostDecimal = new Prisma.Decimal(actualCost).toDecimalPlaces(6);
  const inputCostDecimal = new Prisma.Decimal(inputCost).toDecimalPlaces(6);
  const outputCostDecimal = new Prisma.Decimal(outputCost).toDecimalPlaces(6);

  const result = await prisma.$transaction(async (tx) => {
    // --- Refund or top-up the difference ---
    if (actualCost < reservedAmount) {
      // Refund the unused portion of the reservation.
      const refundAmount = reservedAmount - actualCost;
      const refundDecimal = new Prisma.Decimal(refundAmount).toDecimalPlaces(6);
      if (refundDecimal.toNumber() > 0) {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: refundDecimal } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId,
            type: WALLET_TX_TYPES.REFUND,
            amount: refundDecimal,
            description: `Reservation refund: ${modelLabel}`,
          },
        });
      }
    } else if (actualCost > reservedAmount) {
      // Actual cost exceeded the reservation. Attempt to deduct the extra.
      const extraCost = actualCost - reservedAmount;
      const extraDecimal = new Prisma.Decimal(extraCost).toDecimalPlaces(6);
      if (extraDecimal.toNumber() > 0) {
        // Best-effort: only deduct if balance covers it. If not, the
        // small overage is absorbed (provider already generated tokens).
        await tx.wallet.updateMany({
          where: { id: walletId, balance: { gte: extraDecimal } },
          data: { balance: { decrement: extraDecimal } },
        });
      }
    }

    const updated = await tx.wallet.findUnique({ where: { id: walletId } });
    const remaining = new Prisma.Decimal(updated?.balance ?? 0).toDecimalPlaces(4);

    // --- UsageLog (actual cost) ---
    await tx.usageLog.create({
      data: {
        apiKeyId,
        userId,
        modelId: aiModelId,
        model: modelLabel,
        provider,
        status: "success",
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        inputTokens,
        outputTokens,
        inputCost: inputCostDecimal,
        outputCost: outputCostDecimal,
        totalCost: actualCostDecimal,
        remainingBalance: remaining,
      },
    });

    // --- ApiRequestLog (audit) ---
    if (requestMeta) {
      await tx.apiRequestLog.create({
        data: buildApiRequestLogData({
          apiKeyId,
          userId,
          provider,
          model: modelLabel,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          inputCost,
          outputCost,
          totalCost: actualCost,
          remainingBalance: Number(remaining),
          success: true,
          ...requestMeta,
        }),
      });
    }

    return { updated };
  }).catch((e: Error) => {
    return { error: e.message } as { error: string };
  });

  if (result && "error" in result) {
    return { ok: false, error: result.error };
  }

  const refunded = Math.max(0, reservedAmount - actualCost);
  return {
    ok: true,
    finalBalance: Number(result?.updated?.balance ?? 0),
    actualCost,
    refunded,
    inputCost,
    outputCost,
  };
}

/**
 * Fully refund a reservation when the upstream request failed or was
 * aborted. This is the "cancel" path — no usage was consumed, so all
 * reserved credits are returned.
 */
export async function releaseReservation(params: {
  walletId: string;
  reservedAmount: number;
  description: string;
}): Promise<void> {
  const { walletId, reservedAmount, description } = params;
  if (reservedAmount <= 0) return;

  const refundDecimal = new Prisma.Decimal(reservedAmount).toDecimalPlaces(6);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: refundDecimal } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId,
          type: WALLET_TX_TYPES.REFUND,
          amount: refundDecimal,
          description: `Released reservation: ${description}`,
        },
      });
    });
  } catch (e) {
    console.error("[releaseReservation] failed:", e);
  }
}
