import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";
import {
  createTransaction,
  buildPaymentUrl,
  isPakasirConfigured,
} from "@/app/lib/pakasir";
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
        productTypeSnapshot: pkg.productType,
        tokenQuotaSnapshot: pkg.tokenQuota,
        durationHoursSnapshot: pkg.durationDays * 24,
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

    // Hybrid: buat transaksi via API supaya transactiondetail bisa cek status,
    // lalu bangun URL Pakasir untuk user bayar di halaman Pakasir.
    const createResult = await createTransaction({
      method: "qris",
      orderId: order.id,
      amount: pkg.price,
    });

    if (!createResult.ok) {
      // Jika "Transaction already completed" → transaksi URL sebelumnya sudah dibayar
      if (createResult.error.includes("already completed")) {
        return NextResponse.json(
          { success: false, error: "Invoice ini sudah dibayar sebelumnya. Saldo akan masuk otomatis." },
          { status: 409 },
        );
      }
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", adminNote: createResult.error },
      });
      await prisma.package.update({
        where: { id: body.packageId },
        data: { stock: { increment: 1 } },
      });
      return NextResponse.json({ success: false, error: createResult.error }, { status: 502 });
    }

    const expiredAt = createResult.payment.expired_at
      ? new Date(createResult.payment.expired_at)
      : null;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        pakasirPaymentNumber: createResult.payment.payment_number,
        pakasirExpiredAt: expiredAt,
      },
    });

    const origin = new URL(request.url).origin;
    const urlResult = await buildPaymentUrl({
      orderId: order.id,
      amount: pkg.price,
      redirectUrl: `${origin}/dashboard`,
      qrisOnly: true,
    });

    if (!urlResult.ok) {
      // URL build gagal — transaksi sudah dibuat di Pakasir, tapi user tidak
      // bisa diarahkan ke halaman Pakasir. Tetap return sukses supaya polling
      // jalan, user bisa cek status nanti.
      console.error("[pakasir/create] buildPaymentUrl failed:", urlResult.error);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      checkoutLink: urlResult.ok ? urlResult.url : null,
      totalPayment: createResult.payment.total_payment,
      expiredAt: expiredAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[pakasir/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
