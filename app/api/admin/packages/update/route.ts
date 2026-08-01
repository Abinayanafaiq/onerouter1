import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

const PRODUCT_TYPES = ["LEGACY", "TOKEN_PACKAGE"] as const;

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

    const rl = checkRateLimit(`admin-packages:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const body = (await request.json()) as {
      id: string;
      name?: string;
      description?: string | null;
      tokenQuota?: string | number;
      stock?: number;
      isActive?: boolean;
      price?: number;
      durationDays?: number;
      sort?: number;
      productType?: string;
      allowedModels?: unknown;
    };

    const { id } = body;

    const data: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ success: false, error: "Nama paket tidak boleh kosong" }, { status: 400 });
      }
      data.name = name;
    }

    if (body.description !== undefined) {
      data.description = (typeof body.description === "string" ? body.description.trim() : "") || null;
    }

    if (body.tokenQuota !== undefined && body.tokenQuota !== null && body.tokenQuota !== "") {
      const tokenQuota = BigInt(
        typeof body.tokenQuota === "number" ? body.tokenQuota : body.tokenQuota,
      );
      if (tokenQuota < 0) {
        return NextResponse.json({ success: false, error: "Token quota tidak valid" }, { status: 400 });
      }
      data.tokenQuota = tokenQuota;
    }

    if (typeof body.stock === "number") {
      data.stock = Math.max(0, Math.floor(body.stock));
    }

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (typeof body.price === "number") {
      if (!Number.isFinite(body.price) || body.price < 0) {
        return NextResponse.json({ success: false, error: "Harga tidak valid" }, { status: 400 });
      }
      data.price = Math.floor(body.price);
    }

    if (typeof body.durationDays === "number") {
      const durationDays = Math.floor(body.durationDays);
      if (!(durationDays > 0)) {
        return NextResponse.json({ success: false, error: "Durasi hari tidak valid" }, { status: 400 });
      }
      data.durationDays = durationDays;
    }

    if (typeof body.sort === "number") {
      data.sort = Math.floor(body.sort);
    }

    if (body.productType !== undefined) {
      if (!(PRODUCT_TYPES as readonly string[]).includes(body.productType)) {
        return NextResponse.json({ success: false, error: "Tipe produk tidak valid" }, { status: 400 });
      }
      data.productType = body.productType;
    }

    if (body.allowedModels !== undefined) {
      if (!Array.isArray(body.allowedModels) || body.allowedModels.some((m) => typeof m !== "string")) {
        return NextResponse.json(
          { success: false, error: "allowedModels harus berupa array string" },
          { status: 400 },
        );
      }
      data.allowedModels = (body.allowedModels as string[]).map((m) => m.trim()).filter(Boolean);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada perubahan" }, { status: 400 });
    }

    try {
      await prisma.package.update({
        where: { id },
        data,
      });
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

    await writeAuditLog({ actorUserId: actorId, action: "package.update", target: id });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/packages/update] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
