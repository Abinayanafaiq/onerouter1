import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { isBscConfigured, generateUniqueUsdtAmount, getBscSettings } from "@/app/lib/crypto-bsc";
import { checkOrderCreateLimit, orderCreateRateLimitResponse } from "@/app/lib/rate-limit";
import { parseTopupAmount } from "@/app/lib/topup";

const WALLET_TOPUP_PACKAGE_ID = "wallet-topup";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Harap login" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const rl = checkOrderCreateLimit(userId);
    if (!rl.allowed) {
      return orderCreateRateLimitResponse(rl);
    }
    let body: { amount?: unknown };
    try {
      body = (await request.json()) as { amount?: unknown };
    } catch {
      return NextResponse.json({ success: false, error: "Body JSON tidak valid" }, { status: 400 });
    }

    const parsedAmount = parseTopupAmount(body.amount);
    if (!parsedAmount.ok) {
      return NextResponse.json({ success: false, error: parsedAmount.error }, { status: 400 });
    }
    const amount = parsedAmount.amount;

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

    const order = await prisma.order.create({
      data: {
        userId,
        packageId: WALLET_TOPUP_PACKAGE_ID,
        amount,
        paymentMethod: "CRYPTO_BSC",
        cryptoChain: "USDT-BEP20",
        cryptoAmount: amountResult.usdtAmount,
        cryptoExpectedAmount: amountResult.usdtAmount,
        status: "PENDING",
        adminNote: `Wallet top up Rp${amount.toLocaleString("id-ID")} via USDT BEP20`,
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
