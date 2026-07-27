import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

export async function DELETE(
  _request: Request,
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

    const rl = checkRateLimit(`admin-users:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const { userId } = await params;

    if (!actorId || userId === actorId) {
      return NextResponse.json(
        { success: false, error: "Tidak dapat menghapus akun sendiri." },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan." }, { status: 404 });
    }
    if (target.role === "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Tidak dapat menghapus akun admin. Ubah role user menjadi USER terlebih dahulu." },
        { status: 400 },
      );
    }

    await prisma.user.delete({ where: { id: userId } });

    await writeAuditLog({
      actorUserId: actorId,
      action: "user.delete",
      target: target.email,
    });

    return NextResponse.json({ success: true, deleted: { id: target.id, email: target.email } });
  } catch (e) {
    console.error("[admin/users/[userId] DELETE] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
