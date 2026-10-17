import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  createTransaction,
  qrToDataUrl,
  isPakasirConfigured,
} from "@/app/lib/pakasir";
import { checkOrderCreateLimit, orderCreateRateLimitResponse } from "@/app/lib/rate-limit";
import { normalizeWhatsApp, INVALID_WHATSAPP_ERROR } from "@/app/lib/whatsapp";
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
    let body: { amount?: unknown; whatsapp?: unknown };
    try {
      body = (await request.json()) as { amount?: unknown; whatsapp?: unknown };
    } catch {
      return NextResponse.json({ success: false, error: "Body JSON tidak valid" }, { status: 400 });
    }

    const parsedAmount = parseTopupAmount(body.amount);
    if (!parsedAmount.ok) {
      return NextResponse.json({ success: false, error: parsedAmount.error }, { status: 400 });
    }
    const amount = parsedAmount.amount;

    if (typeof body.whatsapp !== "string" || !body.whatsapp.trim()) {
      return NextResponse.json({ success: false, error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
    }
    const whatsapp = normalizeWhatsApp(body.whatsapp);
    if (!whatsapp) {
      return NextResponse.json({ success: false, error: INVALID_WHATSAPP_ERROR }, { status: 400 });
    }

    if (!(await isPakasirConfigured())) {
      return NextResponse.json(
        { success: false, error: "Pembayaran QRIS belum dikonfigurasi admin. Hubungi admin." },
        { status: 503 },
      );
    }

    const pkg = await prisma.package.findUnique({ where: { id: WALLET_TOPUP_PACKAGE_ID } });
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket top-up tidak tersedia" }, { status: 500 });
    }

    const order = await prisma.order.create({
      data: {
        userId,
        packageId: WALLET_TOPUP_PACKAGE_ID,
        amount,
        whatsapp,
        paymentMethod: "PAKASIR",
        pakasirMethod: "qris",
        status: "PENDING",
        adminNote: `Wallet top up Rp${amount.toLocaleString("id-ID")}`,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { whatsapp },
    }).catch(() => {});

    // API v2: buat transaksi QRIS — response berisi txn_id (disimpan untuk
    // cek status) dan qr_string (ditampilkan sebagai QR di halaman wallet).
    const createResult = await createTransaction({
      method: "qris",
      orderId: order.id,
      amount,
    });

    if (!createResult.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", adminNote: createResult.error },
      });
      return NextResponse.json({ success: false, error: createResult.error }, { status: 502 });
    }

    const txn = createResult.transaction;
    const expiredAt = txn.expired_at ? new Date(txn.expired_at) : null;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        pakasirPaymentNumber: txn.txn_id,
        pakasirExpiredAt: expiredAt,
      },
    });

    const qrImage = await qrToDataUrl(txn.qr_string);
    if (!qrImage) {
      console.error("[wallet/topup-pakasir/create] qrToDataUrl failed for order:", order.id);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      qrImage,
      totalPayment: txn.total_payment,
      expiredAt: expiredAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[wallet/topup-pakasir/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
