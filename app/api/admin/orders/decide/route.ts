import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateApiKey } from "@/app/lib/apikey";
import { WALLET_TX_TYPES } from "@/app/lib/wallet";
import { WALLET_TOPUP_PACKAGE_ID } from "@/app/lib/order-approval";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      orderId: string;
      packageId: string;
      userId: string;
      action: "approve" | "reject";
      note: string;
      masterApiKey?: string;
    };

    const { orderId, action, note, masterApiKey } = body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Order sudah diproses" }, { status: 400 });
    }

    const isWalletTopUp = order.packageId === WALLET_TOPUP_PACKAGE_ID;

    if (action === "reject") {
      // Idempotent reject: only flip PENDING -> REJECTED.
      const claim = await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "REJECTED", adminNote: note || "Ditolak admin" },
      });
      if (claim.count > 0 && !isWalletTopUp) {
        // Restock only for package orders (wallet top-ups never decremented stock).
        await prisma.package.update({
          where: { id: order.packageId },
          data: { stock: { increment: 1 } },
        }).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    // Master API key is only required for package orders (which mint a key).
    if (!isWalletTopUp && (!masterApiKey || masterApiKey.trim().length < 10)) {
      return NextResponse.json(
        { success: false, error: "Master API key wajib diisi saat approve" },
        { status: 400 },
      );
    }

    const pkg = await prisma.package.findUnique({ where: { id: order.packageId } });
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
    const generated = isWalletTopUp ? null : generateApiKey();

    // Single transaction: idempotency guard + API key (if package) + order + wallet credit.
    // The conditional updateMany claims the order atomically — concurrent
    // admin clicks get count === 0 and bail out without double-crediting.
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "APPROVED", activatedAt: now },
      });
      if (claim.count === 0) {
        return { alreadyProcessed: true as const };
      }

      if (!isWalletTopUp && generated) {
        const apiKey = await tx.apiKey.create({
          data: {
            userId: order.userId,
            key: generated.key,
            keyHash: generated.keyHash,
            prefix: generated.prefix,
            last4: generated.last4,
            masterApiKey: masterApiKey!.trim(),
            name: pkg.name,
            label: `${pkg.name} - ${order.paymentMethod}`,
            enabled: true,
            isActive: true,
            tokenQuota: pkg.tokenQuota,
            expiresAt,
            lastResetDay: now,
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            expiresAt,
            apiKeyId: apiKey.id,
            adminNote: note || null,
          },
        });
      } else {
        await tx.order.update({
          where: { id: orderId },
          data: { adminNote: note || `Wallet top up via admin approval` },
        });
      }

      // Credit wallet inside the same transaction.
      const wallet = await tx.wallet.upsert({
        where: { userId: order.userId },
        update: {},
        create: { userId: order.userId, balance: 0 },
      });

      const amountDecimal = new Prisma.Decimal(order.amount);
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WALLET_TX_TYPES.TOPUP,
          amount: amountDecimal,
          description: isWalletTopUp
            ? `Top up wallet Rp${order.amount.toLocaleString("id-ID")} - admin approved`
            : `Top up from order ${order.id} (${pkg.name}) - admin approved`,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amountDecimal } },
      });

      return { alreadyProcessed: false as const };
    });

    if (result.alreadyProcessed) {
      return NextResponse.json({ success: false, error: "Order sudah diproses" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/decide] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
