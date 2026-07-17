import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";
import { createTransaction, isPakasirConfigured } from "@/app/lib/pakasir";
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
    const body = (await request.json()) as { packageId: string; whatsapp?: string };

    if (!body.packageId) {
      return NextResponse.json({ success: false, error: "Package ID diperlukan" }, { status: 400 });
    }
    if (!body.whatsapp || !body.whatsapp.trim()) {
      return NextResponse.json({ success: false, error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
    }

    const pkg = await findPackage(body.packageId);
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 404 });
    }
    if (pkg.stock <= 0) {
      return NextResponse.json({ success: false, error: "Stok habis" }, { status: 400 });
    }

    if (!(await isPakasirConfigured())) {
      return NextResponse.json(
        { success: false, error: "Pakasir belum dikonfigurasi admin. Hubungi admin." },
        { status: 503 },
      );
    }

    const order = await prisma.order.create({
      data: {
        userId,
        packageId: body.packageId,
        amount: pkg.price,
        whatsapp: body.whatsapp.trim(),
        paymentMethod: "PAKASIR",
        pakasirMethod: "qris",
        status: "PENDING",
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { whatsapp: body.whatsapp.trim() },
    }).catch(() => {});

    await prisma.package.update({
      where: { id: body.packageId },
      data: { stock: { decrement: 1 } },
    });

    const result = await createTransaction({
      method: "qris",
      orderId: order.id,
      amount: pkg.price,
    });

    if (!result.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", adminNote: result.error },
      });
      await prisma.package.update({
        where: { id: body.packageId },
        data: { stock: { increment: 1 } },
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
      console.error("[pakasir/create] QR generation failed:", e);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", adminNote: "QR generation failed" },
      });
      await prisma.package.update({
        where: { id: body.packageId },
        data: { stock: { increment: 1 } },
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
    console.error("[pakasir/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
