import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createTransaction, isPakasirConfigured } from "@/app/lib/pakasir";

const WALLET_TOPUP_PACKAGE_ID = "wallet-topup";
const MIN_TOPUP = 1000;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Harap login" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = (await request.json()) as { amount?: number; whatsapp?: string };

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < MIN_TOPUP) {
      return NextResponse.json(
        { success: false, error: `Minimal top up Rp${MIN_TOPUP.toLocaleString("id-ID")}` },
        { status: 400 },
      );
    }

    if (!body.whatsapp || !body.whatsapp.trim()) {
      return NextResponse.json({ success: false, error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
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

    const roundedAmount = Math.round(amount);

    const order = await prisma.order.create({
      data: {
        userId,
        packageId: WALLET_TOPUP_PACKAGE_ID,
        amount: roundedAmount,
        whatsapp: body.whatsapp.trim(),
        paymentMethod: "PAKASIR",
        pakasirMethod: "qris",
        status: "PENDING",
        adminNote: `Wallet top up Rp${roundedAmount.toLocaleString("id-ID")}`,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { whatsapp: body.whatsapp.trim() },
    }).catch(() => {});

    const result = await createTransaction({
      method: "qris",
      orderId: order.id,
      amount: roundedAmount,
    });

    if (!result.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", adminNote: result.error },
      });
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    const expiredAt = result.payment.expired_at ? new Date(result.payment.expired_at) : null;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        pakasirPaymentNumber: result.payment.payment_number,
        pakasirExpiredAt: expiredAt,
      },
    });

    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(result.payment.payment_number, {
        margin: 1,
        width: 320,
        errorCorrectionLevel: "M",
      });
    } catch (e) {
      console.error("[wallet/topup-pakasir/create] QR generation failed:", e);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", adminNote: "QR generation failed" },
      });
      return NextResponse.json(
        { success: false, error: "Gagal membuat gambar QR" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      qrImage: qrDataUrl,
      totalPayment: result.payment.total_payment,
      expiredAt: expiredAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[wallet/topup-pakasir/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
