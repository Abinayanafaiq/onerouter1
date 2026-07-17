import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { generateApiKey } from "./apikey";
import { WALLET_TX_TYPES } from "./wallet";

export const WALLET_TOPUP_PACKAGE_ID = "wallet-topup";

export type ApproveResult =
  | { ok: true; alreadyProcessed: boolean; newBalance: number | null }
  | { ok: false; error: string };

/**
 * Atomically & idempotently approve a paid order.
 *
 * This is the single source of truth for crediting a wallet after payment.
 * Both the Pakasir webhook and the status-polling route call this, so the
 * wallet is credited regardless of whether the webhook is reachable.
 *
 * Idempotency: the very first statement inside the transaction is a conditional
 * `updateMany` that flips PENDING -> APPROVED and only matches once. If the
 * order was already approved (duplicate webhook, or webhook + poll racing),
 * `count` is 0 and we bail out without double-crediting.
 */
export async function approvePaidOrder(
  orderId: string,
  paymentMethodLabel: string,
): Promise<ApproveResult> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      console.error(`[approvePaidOrder] order not found: ${orderId}`);
      return { ok: false, error: "Order not found" };
    }

    console.log(
      `[approvePaidOrder] processing order=${orderId} user=${order.userId} amount=${order.amount} pkg=${order.packageId} status=${order.status}`,
    );

    if (order.status === "APPROVED") {
      console.log(`[approvePaidOrder] order already approved (idempotent skip): ${orderId}`);
      return { ok: true, alreadyProcessed: true, newBalance: null };
    }
    if (order.status !== "PENDING") {
      console.error(`[approvePaidOrder] order in non-pending state ${order.status}: ${orderId}`);
      return { ok: false, error: `Order status is ${order.status}` };
    }

    const pkg = await prisma.package.findUnique({ where: { id: order.packageId } });
    if (!pkg) {
      console.error(`[approvePaidOrder] package not found: ${order.packageId}`);
      return { ok: false, error: "Package not found" };
    }

    const now = new Date();
    const isWalletTopUp = order.packageId === WALLET_TOPUP_PACKAGE_ID;
    const isTokenPackage = pkg.productType === "TOKEN_PACKAGE";

    // Pre-generate API key material for package orders (outside the tx is fine;
    // it's only persisted if the tx commits).
    const quota = order.tokenQuotaSnapshot ?? pkg.tokenQuota;
    const durationHours = order.durationHoursSnapshot ?? pkg.durationDays * 24;
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    const generated = isWalletTopUp ? null : generateApiKey();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Idempotency guard: claim the order. Only one caller can flip
      //    PENDING -> APPROVED; concurrent/duplicate calls get count === 0.
      const claim = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: {
          status: "APPROVED",
          activatedAt: now,
          fulfilledAt: now,
          productTypeSnapshot: order.productTypeSnapshot ?? pkg.productType,
          tokenQuotaSnapshot: order.tokenQuotaSnapshot ?? pkg.tokenQuota,
          durationHoursSnapshot: order.durationHoursSnapshot ?? pkg.durationDays * 24,
        },
      });
      if (claim.count === 0) {
        console.log(`[approvePaidOrder] lost idempotency race, already claimed: ${orderId}`);
        return { alreadyProcessed: true as const, newBalance: null };
      }

      // Token packages grant quota only. They must never credit the PAYG wallet.
      if (isTokenPackage && generated) {
        const apiKey = await tx.apiKey.create({
          data: {
            userId: order.userId,
            key: generated.key,
            keyHash: generated.keyHash,
            prefix: generated.prefix,
            last4: generated.last4,
            masterApiKey: null,
            name: pkg.name,
            label: `${pkg.name} - ${paymentMethodLabel}`,
            enabled: true,
            tokenQuota: quota,
            tokenUsed: 0,
            billingMode: "TOKEN_PACKAGE",
            expiresAt,
            isActive: true,
            lastResetDay: now,
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            expiresAt,
            apiKeyId: apiKey.id,
            adminNote: `Paket token diaktifkan via ${paymentMethodLabel}`,
          },
        });
        return { alreadyProcessed: false as const, newBalance: null };
      }

      // Legacy packages retain their historical wallet-credit behavior.
      const wallet = await tx.wallet.upsert({
        where: { userId: order.userId },
        update: {},
        create: { userId: order.userId, balance: 0 },
      });
      console.log(
        `[approvePaidOrder] wallet found id=${wallet.id} currentBalance=${wallet.balance.toString()}`,
      );

      // 3. Create the WalletTransaction record (audit trail).
      const amountDecimal = new Prisma.Decimal(order.amount);
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WALLET_TX_TYPES.TOPUP,
          amount: amountDecimal,
          description: isWalletTopUp
            ? `Top up wallet Rp${order.amount.toLocaleString("id-ID")} via ${paymentMethodLabel}`
            : `Top up from order ${order.id} (${pkg.name}) via ${paymentMethodLabel}`,
        },
      });
      console.log(`[approvePaidOrder] amount to add=${order.amount}`);

      // 4. Increment the balance atomically.
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amountDecimal } },
      });
      console.log(
        `[approvePaidOrder] updated balance=${updatedWallet.balance.toString()} (was ${wallet.balance.toString()})`,
      );

      // 5. For package orders, create the API key and attach it to the order.
      if (!isWalletTopUp && generated) {
        const apiKey = await tx.apiKey.create({
          data: {
            userId: order.userId,
            key: generated.key,
            keyHash: generated.keyHash,
            prefix: generated.prefix,
            last4: generated.last4,
            masterApiKey: null,
            name: `${pkg.name}`,
            label: `${pkg.name} - ${paymentMethodLabel}`,
            enabled: true,
             tokenQuota: quota,
             billingMode: "LEGACY",
            expiresAt,
            isActive: true,
            lastResetDay: now,
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            expiresAt,
            apiKeyId: apiKey.id,
            adminNote: `Auto-approved via ${paymentMethodLabel}`,
          },
        });
      } else {
        await tx.order.update({
          where: { id: order.id },
          data: { adminNote: `Wallet top up via ${paymentMethodLabel}` },
        });
      }

      return {
        alreadyProcessed: false as const,
        newBalance: Number(updatedWallet.balance),
      };
    });

    // 6. Transaction committed.
    console.log(
      `[approvePaidOrder] transaction committed order=${orderId} alreadyProcessed=${result.alreadyProcessed} newBalance=${result.newBalance}`,
    );
    return { ok: true, ...result };
  } catch (e) {
    // Rollback is automatic on throw inside $transaction.
    console.error(`[approvePaidOrder] FAILED order=${orderId}:`, e);
    return { ok: false, error: (e as Error).message };
  }
}
