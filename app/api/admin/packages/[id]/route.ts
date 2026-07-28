import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

    const rl = checkRateLimit(`admin-packages:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const { id } = await params;

    const orderCount = await prisma.order.count({ where: { packageId: id } });
    if (orderCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak bisa menghapus: paket sudah punya ${orderCount} pesanan. Nonaktifkan saja (set Aktif=off).`,
        },
        { status: 409 },
      );
    }

    try {
      await prisma.package.delete({ where: { id } });
    } catch (e) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code: string }).code === "P2025"
      ) {
        return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 404 });
      }
      throw e;
    }

    await writeAuditLog({ actorUserId: actorId, action: "package.delete", target: id });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/packages/[id] DELETE] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
