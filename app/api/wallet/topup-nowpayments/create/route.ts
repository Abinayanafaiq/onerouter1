import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  createInvoice,
  isNowpaymentsConfigured,
  NOWPAYMENTS_COINS,
} from "@/app/lib/nowpayments";

const WALLET_TOPUP_PACKAGE_ID = "wallet-topup";
const MIN_TOPUP = 1000;

function publicBaseUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env && !env.includes("localhost")) return env.replace(/\/+$/, "");
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Harap login" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = (await request.json()) as { amount?: number; coin?: string };

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < MIN_TOPUP) {
      return NextResponse.json(
        { success: false, error: `Minimal top up Rp${MIN_TOPUP.toLocaleString("id-ID")}` },
        { status: 400 },
      );
    }

    const coinDef = NOWPAYMENTS_COINS.find((c) => c.id === body.coin);
    if (!coinDef) {
      return NextResponse.json({ success: false, error: "Coin tidak valid" }, { status: 400 });
    }

    if (!(await isNowpaymentsConfigured())) {
      return NextResponse.json(
        { success: false, error: "NOWPayments belum dikonfigurasi admin." },
        { status: 503 },
      );
    }

    const pkg = await prisma.package.findUnique({ where: { id: WALLET_TOPUP_PACKAGE_ID } });
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket top-up tidak tersedia" }, { status: 500 });
    }

    const origin = publicBaseUrl(request);
    if (!origin) {
      return NextResponse.json({ success: false, error: "Base URL tidak terdeteksi" }, { status: 500 });
    }

    const roundedAmount = Math.round(amount);

    const order = await prisma.order.create({
      data: {
        userId,
        packageId: WALLET_TOPUP_PACKAGE_ID,
        amount: roundedAmount,
        paymentMethod: "NOWPAYMENTS",
        cryptoChain: coinDef.payCurrency,
        status: "PENDING",
        adminNote: `Wallet top up Rp${roundedAmount.toLocaleString("id-ID")} via NOWPayments`,
      },
    });

    const invoice = await createInvoice({
      orderId: order.id,
      amount: roundedAmount,
      payCurrency: coinDef.payCurrency,
      ipnCallbackUrl: `${origin}/api/nowpayments/webhook`,
    });

    if (!invoice.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", adminNote: invoice.error },
      });
      return NextResponse.json({ success: false, error: invoice.error }, { status: 502 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        nowpaymentsInvoiceId: invoice.invoiceId,
        nowpaymentsPayCurrency: invoice.payCurrency,
        cryptoAmount: invoice.payAmount || null,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      checkoutLink: invoice.invoiceUrl,
      payAmount: invoice.payAmount,
      payCurrency: invoice.payCurrency,
    });
  } catch (e) {
    console.error("[wallet/topup-nowpayments/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
