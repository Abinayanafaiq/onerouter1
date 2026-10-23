import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getUpstreamPriority,
  saveUpstreamPriority,
  validateUpstreamPriority,
} from "@/app/lib/backup-routing";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

/** Urutan prioritas + failover upstream backup (#1, #2, ...). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ success: true, items: await getUpstreamPriority() });
  } catch (e) {
    console.error("[admin/settings/backup-priority GET] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/** Simpan urutan baru. Body: { order: string[] } — index 0 = upstream utama. */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const actorId = (session.user as { id?: string }).id ?? null;
    const rl = checkRateLimit(`admin-backup-priority:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        },
      );
    }

    const body = (await request.json()) as { order?: unknown };
    const order = await validateUpstreamPriority(body.order);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Urutan tidak valid — muat ulang halaman lalu coba lagi" },
        { status: 400 },
      );
    }

    await saveUpstreamPriority(order);
    await writeAuditLog({
      actorUserId: actorId,
      action: "backup_upstreams.priority",
      target: order.join(" > "),
    });

    return NextResponse.json({ success: true, items: await getUpstreamPriority() });
  } catch (e) {
    console.error("[admin/settings/backup-priority POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
