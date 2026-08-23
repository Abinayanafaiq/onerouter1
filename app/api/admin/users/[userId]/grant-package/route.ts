import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { approvePaidOrder } from "@/app/lib/order-approval";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

/**
 * Grant manual: admin mengaktifkan paket ke user tanpa pembayaran.
 *
 * Alurnya memakai mesin yang sama dengan order biasa demi konsistensi data:
 * buat order PENDING (amount 0, paymentMethod ADMIN_GRANT, TANPA potong stok),
 * lalu serahkan ke approvePaidOrder() — single source of truth aktivasi yang
 * idempotent: flip status, set snapshot/activatedAt/expiresAt, buat API key
 * paket, dan tautkan order.apiKeyId.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const actorId = (session.user as { id?: string }).id ?? null;

    const rl = checkRateLimit(`admin-grant-package:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const { userId } = await params;

    const body = (await request.json()) as { packageId?: string; note?: string };
    const packageId = body.packageId?.trim();
    if (!packageId) {
      return NextResponse.json({ success: false, error: "Paket wajib dipilih" }, { status: 400 });
    }
    const note = body.note?.trim() || null;

    const [user, pkg] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, whatsapp: true },
      }),
      prisma.package.findUnique({ where: { id: packageId } }),
    ]);
    if (!user) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 404 });
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        packageId: pkg.id,
        amount: 0,
        whatsapp: user.whatsapp,
        paymentMethod: "ADMIN_GRANT",
        status: "PENDING",
        productTypeSnapshot: pkg.productType,
        tokenQuotaSnapshot: pkg.tokenQuota,
        durationHoursSnapshot: pkg.durationDays * 24,
        adminNote: note ?? "Paket diberikan manual oleh admin",
      },
    });

    const result = await approvePaidOrder(order.id, "grant admin");
    if (!result.ok) {
      // Jangan tinggalkan order PENDING menggantung kalau aktivasi gagal.
      await prisma.order
        .updateMany({
          where: { id: order.id, status: "PENDING" },
          data: { status: "CANCELLED", adminNote: `Grant gagal: ${result.error}` },
        })
        .catch(() => {});
      return NextResponse.json(
        { success: false, error: `Gagal mengaktifkan paket: ${result.error}` },
        { status: 500 },
      );
    }

    await writeAuditLog({ actorUserId: actorId, action: "order.grant", target: order.id });

    const activated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { apiKey: true },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: activated?.status ?? "APPROVED",
        expiresAt: activated?.expiresAt?.toISOString() ?? null,
      },
      apiKey: activated?.apiKey
        ? {
            id: activated.apiKey.id,
            // Key terbitan order memang disimpan plaintext (lihat ApiKey.key) dan
            // juga bisa dilihat admin di halaman detail order.
            key: activated.apiKey.key,
            // BigInt wajib di-string-kan sebelum NextResponse.json.
            tokenQuota: activated.apiKey.tokenQuota.toString(),
            expiresAt: activated.apiKey.expiresAt?.toISOString() ?? null,
          }
        : null,
    });
  } catch (e) {
    console.error("[admin/grant-package] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
