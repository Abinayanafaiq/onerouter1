import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";
import { validateRenewalKey } from "@/app/lib/package-renewal";
import { checkOrderCreateLimit } from "@/app/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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

    const whatsapp = body.whatsapp.trim();

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

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          packageId: body.packageId,
          amount: pkg.price,
          whatsapp,
          paymentMethod: "MANUAL",
          status: "PENDING",
          apiKeyId: renewApiKeyId,
          productTypeSnapshot: pkg.productType,
          tokenQuotaSnapshot: pkg.tokenQuota,
          durationHoursSnapshot: pkg.durationDays * 24,
        },
      });

      if (!renewApiKeyId) {
        await tx.package.update({
          where: { id: body.packageId },
          data: { stock: { decrement: 1 } },
        });
      }

      return created;
    });

    await prisma.user.update({
      where: { id: userId },
      data: { whatsapp },
    }).catch(() => {});

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (e) {
    console.error("[manual/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
