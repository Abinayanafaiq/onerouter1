import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  updateAnnouncement,
  deleteAnnouncement,
  normalizeLevel,
  type AnnouncementLevel,
} from "@/app/lib/announcements";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;
const MAX_TITLE = 200;
const MAX_BODY = 10_000;

async function guard() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user?.role !== "ADMIN") {
    return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }
  const actorId = (session.user as { id?: string }).id ?? null;
  const rl = checkRateLimit(`admin-announcements:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
  if (!rl.allowed) {
    return {
      error: NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        },
      ),
    };
  }
  return { actorId };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const g = await guard();
    if ("error" in g) return g.error;

    const { id } = await params;
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      level?: string;
      pinned?: boolean;
      published?: boolean;
    };

    const patch: {
      title?: string;
      body?: string;
      level?: AnnouncementLevel;
      pinned?: boolean;
      published?: boolean;
    } = {};
    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title || title.length > MAX_TITLE) {
        return NextResponse.json({ success: false, error: "Judul tidak valid" }, { status: 400 });
      }
      patch.title = title;
    }
    if (body.body !== undefined) {
      const text = body.body.trim();
      if (!text || text.length > MAX_BODY) {
        return NextResponse.json({ success: false, error: "Isi pengumuman tidak valid" }, { status: 400 });
      }
      patch.body = text;
    }
    if (body.level !== undefined) patch.level = normalizeLevel(body.level);
    if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
    if (typeof body.published === "boolean") patch.published = body.published;

    const updated = await updateAnnouncement(id, patch);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const action = body.published === true
      ? "announcement.publish"
      : body.published === false
        ? "announcement.unpublish"
        : "announcement.update";
    await writeAuditLog({ actorUserId: g.actorId, action, target: id });

    return NextResponse.json({ success: true, announcement: updated });
  } catch (e) {
    console.error("[admin/announcements/[id] PATCH] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const g = await guard();
    if ("error" in g) return g.error;

    const { id } = await params;
    const ok = await deleteAnnouncement(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await writeAuditLog({ actorUserId: g.actorId, action: "announcement.delete", target: id });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/announcements/[id] DELETE] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
