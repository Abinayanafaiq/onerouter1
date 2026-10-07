import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";
import { validateRenewalKey } from "@/app/lib/package-renewal";
import { approvePaidOrder } from "@/app/lib/order-approval";
import { checkOrderCreateLimit } from "@/app/lib/rate-limit";
import { toksToIdr, formatToks } from "@/app/lib/constants";
import { WALLET_TX_TYPES } from "@/app/lib/wallet";

export const dynamic = "force-dynamic";

/**
 * Beli / perpanjang paket memakai saldo TOKS (wallet).
 *
 * Berbeda dari QRIS/crypto, pembayaran TOKS instan: saldo dipotong atomik di
 * dalam SATU transaksi bersama pembuatan order & pengurangan stok, lalu
 * approvePaidOrder() mengaktifkan paket (sama seperti webhook gateway). Bila
 * aktivasi gagal, saldo di-refund dan stok dikembalikan secara kompensasi.
 */
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

    const pkg = await findPackage(body.packageId);
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 404 });
    }
    if (pkg.toksPrice == null || pkg.toksPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Paket ini tidak bisa dibeli memakai TOKS" },
        { status: 400 },
      );
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
    }

    const costToks = pkg.toksPrice;
    const costIdr = toksToIdr(costToks);
    const costDecimal = new Prisma.Decimal(costIdr);
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";

    const created = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: 0 },
      });

      // Potong saldo secara atomik — hanya berhasil bila saldo mencukupi.
      // Row-level lock PostgreSQL membuatnya aman dari request bersamaan.
      const charged = await tx.wallet.updateMany({
        where: { id: wallet.id, balance: { gte: costDecimal } },
        data: { balance: { decrement: costDecimal } },
      });
      if (charged.count === 0) {
        throw new Error(
          `Saldo TOKS tidak cukup. Harga paket ${formatToks(costToks)} — silakan top up dulu.`,
        );
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WALLET_TX_TYPES.PURCHASE,
          amount: costDecimal,
          description: `Beli paket ${pkg.name} seharga ${formatToks(costToks)}`,
        },
      });

      // Kurangi stok secara atomik (kecuali renew, yang tidak mengambil stok).
      if (!renewApiKeyId) {
        const stocked = await tx.package.updateMany({
          where: { id: pkg.id, stock: { gte: 1 } },
          data: { stock: { decrement: 1 } },
        });
        if (stocked.count === 0) {
          throw new Error("Stok habis");
        }
      }

      return tx.order.create({
        data: {
          userId,
          packageId: pkg.id,
          amount: costIdr,
          whatsapp: whatsapp || null,
          paymentMethod: "TOKS",
          status: "PENDING",
          apiKeyId: renewApiKeyId,
          productTypeSnapshot: pkg.productType,
          tokenQuotaSnapshot: pkg.tokenQuota,
          durationHoursSnapshot: pkg.durationDays * 24,
        },
      });
    }).catch((e: Error) => ({ error: e.message } as { error: string }));

    if ("error" in created) {
      const msg = created.error;
      const status = /tidak cukup|Stok habis/.test(msg) ? 400 : 500;
      return NextResponse.json({ success: false, error: msg }, { status });
    }

    const order = created;

    if (whatsapp) {
      await prisma.user.update({
        where: { id: userId },
        data: { whatsapp },
      }).catch(() => {});
    }

    // Aktivasi paket memakai jalur yang sama dengan webhook gateway
    // (idempotent: flip PENDING -> APPROVED + terbitkan/perpanjang API key).
    const approval = await approvePaidOrder(order.id, "Saldo TOKS");

    if (!approval.ok) {
      // Kompensasi: refund saldo, kembalikan stok, batalkan order.
      console.error(`[toks/create] activation failed for order=${order.id}: ${approval.error} — refunding`);
      await prisma.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: { id: order.id, status: "PENDING" },
          data: { status: "CANCELLED", adminNote: `Aktivasi TOKS gagal, saldo di-refund: ${approval.error}` },
        });
        const wallet = await tx.wallet.upsert({
          where: { userId },
          update: {},
          create: { userId, balance: 0 },
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: costDecimal } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WALLET_TX_TYPES.REFUND,
            amount: costDecimal,
            description: `Refund pembelian paket ${pkg.name} (aktivasi gagal)`,
          },
        });
        if (!renewApiKeyId) {
          await tx.package.update({
            where: { id: pkg.id },
            data: { stock: { increment: 1 } },
          });
        }
      });
      return NextResponse.json(
        { success: false, error: `Aktivasi gagal, saldo TOKS Anda sudah dikembalikan: ${approval.error}` },
        { status: 500 },
      );
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: "APPROVED",
      toksSpent: costToks,
      newBalance: Number(wallet?.balance ?? 0),
    });
  } catch (e) {
    console.error("[toks/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
