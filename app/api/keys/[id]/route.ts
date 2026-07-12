import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { updateApiKey, deleteApiKey, type UpdateApiKeyInput } from "@/app/lib/api-keys";

export const dynamic = "force-dynamic";

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const patch: UpdateApiKeyInput = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ success: false, error: "Name cannot be empty" }, { status: 400 });
      if (name.length > 60) return NextResponse.json({ success: false, error: "Name too long" }, { status: 400 });
      patch.name = name;
    }

    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

    if ("expiresAt" in body) {
      if (body.expiresAt === null || body.expiresAt === "") {
        patch.expiresAt = null;
      } else {
        const d = new Date(String(body.expiresAt));
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ success: false, error: "Invalid expiresAt" }, { status: 400 });
        }
        patch.expiresAt = d;
      }
    }

    if ("ipWhitelist" in body) patch.ipWhitelist = parseStringArray(body.ipWhitelist);
    if ("allowedModels" in body) patch.allowedModels = parseStringArray(body.allowedModels);

    if ("rateLimit" in body) {
      if (body.rateLimit === null || body.rateLimit === "") {
        patch.rateLimit = null;
      } else {
        const n = Number(body.rateLimit);
        if (!Number.isFinite(n) || n <= 0) {
          return NextResponse.json({ success: false, error: "Invalid rateLimit" }, { status: 400 });
        }
        patch.rateLimit = Math.floor(n);
      }
    }

    const updated = await updateApiKey(userId, id, patch);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, key: updated });
  } catch (e) {
    console.error("[keys/[id] PATCH] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const ok = await deleteApiKey(userId, id);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[keys/[id] DELETE] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
