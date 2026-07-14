import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";
import {
  createInvoice,
  isNowpaymentsConfigured,
  NOWPAYMENTS_COINS,
} from "@/app/lib/nowpayments";

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
    const body = (await request.json()) as { packageId: string; coin: string };
    const { packageId, coin } = body;

    const pkg = await findPackage(packageId);
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 400 });
    }

    if (pkg.stock <= 0) {
      return NextResponse.json({ success: false, error: "Paket habis terjual" }, { status: 400 });
    }

    const coinDef = NOWPAYMENTS_COINS.find((c) => c.id === coin);
    if (!coinDef) {
      return NextResponse.json({ success: false, error: "Coin tidak valid" }, { status: 400 });
    }

    if (!(await isNowpaymentsConfigured())) {
      return NextResponse.json(
        { success: false, error: "NOWPayments belum dikonfigurasi." },
        { status: 503 },
      );
    }

    const origin = publicBaseUrl(request);
    if (!origin) {
      return NextResponse.json({ success: false, error: "Base URL tidak terdeteksi" }, { status: 500 });
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          packageId,
          amount: pkg.price,
          paymentMethod: "NOWPAYMENTS",
          cryptoChain: coinDef.payCurrency,
          status: "PENDING",
        },
      });

      await tx.package.update({
        where: { id: packageId },
        data: { stock: { decrement: 1 } },
      });

      return created;
    });

    const invoice = await createInvoice({
      orderId: order.id,
      amount: pkg.price,
      payCurrency: coinDef.payCurrency,
      ipnCallbackUrl: `${origin}/api/nowpayments/webhook`,
      successUrl: `${origin}/dashboard?payment=success`,
      cancelUrl: `${origin}/checkout/${packageId}?payment=cancelled`,
      orderDescription: `${pkg.name} - Order ${order.id.slice(-8)}`,
    });

    if (!invoice.ok) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED", adminNote: invoice.error },
        });
        await tx.package.update({
          where: { id: packageId },
          data: { stock: { increment: 1 } },
        });
      });
      return NextResponse.json({ success: false, error: invoice.error }, { status: 502 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        nowpaymentsInvoiceId: invoice.invoiceId,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutLink: invoice.invoiceUrl,
    });
  } catch (e) {
    console.error("[nowpayments/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
