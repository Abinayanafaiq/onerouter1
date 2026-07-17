import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { isBscConfigured, generateUniqueUsdtAmount, getBscSettings } from "@/app/lib/crypto-bsc";
import { checkOrderCreateLimit } from "@/app/lib/rate-limit";

const WALLET_TOPUP_PACKAGE_ID = "wallet-topup";
const MIN_TOPUP = 1000;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Harap login" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const rl = checkOrderCreateLimit(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: `Terlalu banyak membuat pesanan. Maksimal ${rl.limit} per 3 menit, coba lagi dalam ${rl.retryAfter} detik.` },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfter),
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }
    const body = (await request.json()) as { amount?: number };

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < MIN_TOPUP) {
      return NextResponse.json(
        { success: false, error: `Minimal top up Rp${MIN_TOPUP.toLocaleString("id-ID")}` },
        { status: 400 },
      );
    }

    if (!(await isBscConfigured())) {
      return NextResponse.json(
        { success: false, error: "Pembayaran crypto belum dikonfigurasi admin." },
        { status: 503 },
      );
    }

    const pkg = await prisma.package.findUnique({ where: { id: WALLET_TOPUP_PACKAGE_ID } });
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket top-up tidak tersedia" }, { status: 500 });
    }

    const amountResult = await generateUniqueUsdtAmount(amount);
    if (!amountResult.ok) {
      return NextResponse.json({ success: false, error: amountResult.error }, { status: 400 });
    }

    const { walletAddress } = await getBscSettings();
    const roundedAmount = Math.round(amount);

    const order = await prisma.order.create({
      data: {
        userId,
        packageId: WALLET_TOPUP_PACKAGE_ID,
        amount: roundedAmount,
        paymentMethod: "CRYPTO_BSC",
        cryptoChain: "USDT-BEP20",
        cryptoAmount: amountResult.usdtAmount,
        cryptoExpectedAmount: amountResult.usdtAmount,
        status: "PENDING",
        adminNote: `Wallet top up Rp${roundedAmount.toLocaleString("id-ID")} via USDT BEP20`,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      payAmount: amountResult.usdtAmount,
      payCurrency: "USDT",
      chain: "BEP20 (BSC)",
      walletAddress,
    });
  } catch (e) {
    console.error("[bsc/topup-create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
