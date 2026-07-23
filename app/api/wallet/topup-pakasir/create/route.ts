import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  createTransaction,
  buildPaymentUrl,
  isPakasirConfigured,
} from "@/app/lib/pakasir";
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

    // Hybrid: buat transaksi via API supaya transactiondetail bisa cek status,
    // lalu bangun URL Pakasir untuk user bayar di halaman Pakasir.
    const createResult = await createTransaction({
      method: "qris",
      orderId: order.id,
      amount: roundedAmount,
    });

    if (!createResult.ok) {
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
      amount: roundedAmount,
      redirectUrl: `${origin}/dashboard/wallet`,
      qrisOnly: true,
    });

    if (!urlResult.ok) {
      console.error("[wallet/topup-pakasir/create] buildPaymentUrl failed:", urlResult.error);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      checkoutLink: urlResult.ok ? urlResult.url : null,
      totalPayment: createResult.payment.total_payment,
      expiredAt: expiredAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[wallet/topup-pakasir/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
