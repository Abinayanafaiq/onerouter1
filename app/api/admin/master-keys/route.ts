import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  listMasterApiKeys,
  createMasterApiKey,
} from "@/app/lib/master-api-keys";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const keys = await listMasterApiKeys();
    return NextResponse.json({ success: true, keys });
  } catch (e) {
    console.error("[admin/master-keys GET] exception:", e);
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

    const rl = checkRateLimit(`admin-master-keys:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        },
      );
    }

    const body = (await request.json()) as { plaintext?: string; label?: string; priority?: number };

    if (!body.plaintext || !body.plaintext.trim()) {
      return NextResponse.json({ success: false, error: "Master key (plaintext) diperlukan" }, { status: 400 });
    }
    if (!body.label || !body.label.trim()) {
      return NextResponse.json({ success: false, error: "Label diperlukan" }, { status: 400 });
    }

    const priority = typeof body.priority === "number" ? body.priority : 0;

    const created = await createMasterApiKey({
      plaintext: body.plaintext,
      label: body.label,
      priority,
    });

    await writeAuditLog({
      actorUserId: actorId,
      action: "master_key.create",
      target: created.id,
    });

    return NextResponse.json({ success: true, key: created });
  } catch (e) {
    console.error("[admin/master-keys POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
