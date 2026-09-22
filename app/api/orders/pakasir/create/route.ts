import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";
import { validateRenewalKey } from "@/app/lib/package-renewal";
import {
  createTransaction,
  qrToDataUrl,
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
    const body = (await request.json()) as {
      packageId: string;
      whatsapp?: string;
      renewApiKeyId?: string;
    };

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

    // Renew: perpanjang key paket lama (apiKeyId terisi sejak order dibuat).
    // Tidak menerbitkan key baru, jadi tidak memeriksa/mengurangi stok.
    const renewApiKeyId =
      typeof body.renewApiKeyId === "string" && body.renewApiKeyId.trim()
        ? body.renewApiKeyId.trim()
        : null;
    if (renewApiKeyId) {
      if (pkg.productType !== "TOKEN_PACKAGE") {
        return NextResponse.json(
          { success: false, error: "Hanya paket token yang bisa diperpanjang" },
          { status: 400 },
        );
      }
      const renewal = await validateRenewalKey({
        userId,
        apiKeyId: renewApiKeyId,
        packageId: body.packageId,
      });
      if (!renewal.ok) {
        return NextResponse.json({ success: false, error: renewal.error }, { status: 400 });
      }
    } else if (pkg.stock <= 0) {
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
        apiKeyId: renewApiKeyId,
        productTypeSnapshot: pkg.productType,
        tokenQuotaSnapshot: pkg.tokenQuota,
        durationHoursSnapshot: pkg.durationDays * 24,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { whatsapp: body.whatsapp.trim() },
    }).catch(() => {});

    if (!renewApiKeyId) {
      await prisma.package.update({
        where: { id: body.packageId },
        data: { stock: { decrement: 1 } },
      });
    }
    // API v2: buat transaksi QRIS — response berisi txn_id (disimpan untuk
    // cek status) dan qr_string (ditampilkan sebagai QR di halaman checkout).
    const createResult = await createTransaction({
      method: "qris",
      orderId: order.id,
      amount: pkg.price,
    });

    if (!createResult.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", adminNote: createResult.error },
      });
      // Renew tidak pernah mengurangi stok, jadi tidak ada yang dikembalikan.
      if (!renewApiKeyId) {
        await prisma.package.update({
          where: { id: body.packageId },
          data: { stock: { increment: 1 } },
        });
      }
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
      // QR gagal dirender — transaksi sudah dibuat di Pakasir. Tetap return
      // sukses supaya polling jalan, user bisa cek status nanti.
      console.error("[pakasir/create] qrToDataUrl failed for order:", order.id);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      qrImage,
      totalPayment: txn.total_payment,
      expiredAt: expiredAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[pakasir/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
