import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getBackupRoutingMap,
  getExtraUpstreams,
  buildExtraUpstreams,
  saveExtraUpstreams,
  toExtraUpstreamView,
} from "@/app/lib/backup-routing";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

/** Upstream backup tambahan (#2, #3, ...). Upstream #1 ada di /backup-routing. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const list = await getExtraUpstreams();
    return NextResponse.json({ success: true, upstreams: list.map(toExtraUpstreamView) });
  } catch (e) {
    console.error("[admin/settings/backup-upstreams GET] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/** Ganti seluruh daftar upstream tambahan. API key kosong = pertahankan key lama. */
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
    const rl = checkRateLimit(`admin-backup-upstreams:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        },
      );
    }

    const body = (await request.json()) as { upstreams?: unknown };
    const [existing, { map: primaryMap }] = await Promise.all([
      getExtraUpstreams(),
      getBackupRoutingMap(),
    ]);

    let built;
    try {
      built = buildExtraUpstreams(body.upstreams, existing, primaryMap);
    } catch (e) {
      // encryptSecret melempar kalau MASTER_KEY_ENCRYPTION_KEY tidak diset/invalid.
      console.error("[admin/settings/backup-upstreams POST] encrypt failed:", e);
      return NextResponse.json(
        { success: false, error: "Gagal mengenkripsi API key — cek MASTER_KEY_ENCRYPTION_KEY di environment" },
        { status: 500 },
      );
    }
    if (typeof built === "string") {
      return NextResponse.json({ success: false, error: built }, { status: 400 });
    }

    await saveExtraUpstreams(built);
    await writeAuditLog({
      actorUserId: actorId,
      action: "backup_upstreams.update",
      target: `${built.length} upstream`,
    });

    return NextResponse.json({ success: true, upstreams: built.map(toExtraUpstreamView) });
  } catch (e) {
    console.error("[admin/settings/backup-upstreams POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
