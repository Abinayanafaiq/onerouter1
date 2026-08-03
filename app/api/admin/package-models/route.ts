import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

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

    const rl = checkRateLimit(`admin-package-models:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const body = (await request.json()) as {
      modelId?: string;
      upstreamId?: string;
      name?: string;
      provider?: string;
      sort?: number;
      enabled?: boolean;
      supportsStreaming?: boolean;
    };

    // ID publik tidak pernah memakai prefix wz/ — strip kalau admin tidak sengaja
    // menyertakannya (resolvePackageModel juga men-strip di sisi baca).
    const modelId = body.modelId?.trim().replace(/^wz\//, "");
    if (!modelId) {
      return NextResponse.json({ success: false, error: "Model ID wajib diisi" }, { status: 400 });
    }
    const upstreamId = body.upstreamId?.trim();
    if (!upstreamId) {
      return NextResponse.json({ success: false, error: "Upstream ID wajib diisi" }, { status: 400 });
    }
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Nama model wajib diisi" }, { status: 400 });
    }

    const provider = body.provider?.trim() || "WeizeRouter";
    const sort = Math.floor(Number(body.sort) || 0);
    const enabled = body.enabled !== false;
    const supportsStreaming = body.supportsStreaming !== false;

    try {
      const created = await prisma.packageModel.create({
        data: { modelId, upstreamId, name, provider, sort, enabled, supportsStreaming },
      });

      await writeAuditLog({ actorUserId: actorId, action: "package-model.create", target: created.id });

      return NextResponse.json({ success: true, model: created });
    } catch (e) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { success: false, error: "Model ID atau Upstream ID sudah terdaftar" },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (e) {
    console.error("[admin/package-models POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
