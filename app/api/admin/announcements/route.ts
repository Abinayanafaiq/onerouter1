import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  listAllAnnouncements,
  createAnnouncement,
  normalizeLevel,
} from "@/app/lib/announcements";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;
const MAX_TITLE = 200;
const MAX_BODY = 10_000;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const announcements = await listAllAnnouncements();
    return NextResponse.json({ success: true, announcements });
  } catch (e) {
    console.error("[admin/announcements GET] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

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

    const rl = checkRateLimit(`admin-announcements:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        },
      );
    }

    const body = (await request.json()) as {
      title?: string;
      body?: string;
      level?: string;
      pinned?: boolean;
      published?: boolean;
    };

    const title = body.title?.trim() ?? "";
    const text = body.body?.trim() ?? "";
    if (!title) {
      return NextResponse.json({ success: false, error: "Judul diperlukan" }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ success: false, error: "Isi pengumuman diperlukan" }, { status: 400 });
    }
    if (title.length > MAX_TITLE) {
      return NextResponse.json({ success: false, error: `Judul maksimal ${MAX_TITLE} karakter` }, { status: 400 });
    }
    if (text.length > MAX_BODY) {
      return NextResponse.json({ success: false, error: `Isi maksimal ${MAX_BODY} karakter` }, { status: 400 });
    }

    const created = await createAnnouncement({
      title,
      body: text,
      level: normalizeLevel(body.level),
      pinned: body.pinned === true,
      published: body.published !== false,
      createdById: actorId,
    });

    await writeAuditLog({
      actorUserId: actorId,
      action: "announcement.create",
      target: created.id,
    });

    return NextResponse.json({ success: true, announcement: created });
  } catch (e) {
    console.error("[admin/announcements POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
