import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createPayment, isSumopodConfigured } from "@/app/lib/sumopod";
import { checkOrderCreateLimit } from "@/app/lib/rate-limit";
import { getSiteUrl } from "@/app/lib/site";

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

    if (!(await isSumopodConfigured())) {
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
        paymentMethod: "SUMOPOD",
        status: "PENDING",
        adminNote: `Wallet top up Rp${roundedAmount.toLocaleString("id-ID")}`,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { whatsapp: body.whatsapp.trim() },
    }).catch(() => {});

    const createResult = await createPayment({
      orderId: order.id,
      amount: roundedAmount,
      successReturnUrl: `${getSiteUrl()}/dashboard/wallet`,
      cancelReturnUrl: `${getSiteUrl()}/dashboard/wallet`,
    });

    if (!createResult.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", adminNote: createResult.error },
      });
      return NextResponse.json({ success: false, error: createResult.error }, { status: 502 });
    }

    const expiredAt = createResult.payment.expires_at
      ? new Date(createResult.payment.expires_at)
      : null;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        sumopodPaymentId: createResult.payment.payment_id,
        sumopodExpiredAt: expiredAt,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      checkoutLink: createResult.payment.payment_link_url,
      // Sumopod membebankan fee di atas nominal: customer membayar
      // amount + fee, wallet dikredit sebesar nominal top up.
      totalPayment: createResult.payment.amount,
      expiredAt: expiredAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[wallet/topup-sumopod/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
