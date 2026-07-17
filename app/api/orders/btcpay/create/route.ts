import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";
import { createInvoice, CRYPTO_CHAINS, isBtcpayConfigured } from "@/app/lib/btcpay";
import { checkOrderCreateLimit } from "@/app/lib/rate-limit";

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
    const body = (await request.json()) as { packageId: string; chain: string };
    const { packageId, chain } = body;

    const pkg = await findPackage(packageId);
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 400 });
    }

    if (pkg.stock <= 0) {
      return NextResponse.json({ success: false, error: "Paket habis terjual" }, { status: 400 });
    }

    const chainDef = CRYPTO_CHAINS.find((c) => c.id === chain);
    if (!chainDef) {
      return NextResponse.json({ success: false, error: "Chain tidak valid" }, { status: 400 });
    }

    if (!isBtcpayConfigured()) {
      return NextResponse.json(
        { success: false, error: "BTCPay belum dikonfigurasi. Gunakan Transfer Bank." },
        { status: 503 },
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          packageId,
          amount: pkg.price,
          paymentMethod: "CRYPTO",
          cryptoChain: chainDef.chain,
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
      currency: "IDR",
      chain: chainDef.chain,
    });

    if ("error" in invoice) {
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
      data: { btcpayInvoiceId: invoice.invoiceId },
    });

    return NextResponse.json({ success: true, checkoutLink: invoice.checkoutLink });
  } catch (e) {
    console.error("[btcpay/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}