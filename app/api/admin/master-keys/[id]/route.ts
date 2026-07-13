import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  updateMasterApiKey,
  deleteMasterApiKey,
} from "@/app/lib/master-api-keys";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

export async function PATCH(
  request: Request,
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

    const { id } = await params;

    const body = (await request.json()) as {
      label?: string;
      priority?: number;
      enabled?: boolean;
    };

    const patch: { label?: string; priority?: number; enabled?: boolean } = {};
    if (body.label !== undefined) patch.label = body.label;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.enabled !== undefined) patch.enabled = body.enabled;

    const updated = await updateMasterApiKey(id, patch);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const action = body.enabled === true
      ? "master_key.enable"
      : body.enabled === false
        ? "master_key.disable"
        : "master_key.update";

    await writeAuditLog({ actorUserId: actorId, action, target: id });

    return NextResponse.json({ success: true, key: updated });
  } catch (e) {
    console.error("[admin/master-keys/[id] PATCH] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

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

    const { id } = await params;
    const ok = await deleteMasterApiKey(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await writeAuditLog({ actorUserId: actorId, action: "master_key.delete", target: id });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/master-keys/[id] DELETE] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
