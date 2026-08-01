import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;

const PRODUCT_TYPES = ["LEGACY", "TOKEN_PACKAGE"] as const;
type ProductType = (typeof PRODUCT_TYPES)[number];

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
      name?: string;
      description?: string | null;
      tokenQuota?: string | number;
      price?: number;
      durationDays?: number;
      sort?: number;
      stock?: number;
      productType?: string;
      isActive?: boolean;
      allowedModels?: unknown;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Nama paket wajib diisi" }, { status: 400 });
    }

    const tokenQuotaRaw = body.tokenQuota;
    if (tokenQuotaRaw === undefined || tokenQuotaRaw === null || tokenQuotaRaw === "") {
      return NextResponse.json({ success: false, error: "Token quota wajib diisi" }, { status: 400 });
    }
    const tokenQuota = BigInt(typeof tokenQuotaRaw === "number" ? tokenQuotaRaw : tokenQuotaRaw);
    if (tokenQuota < 0) {
      return NextResponse.json({ success: false, error: "Token quota tidak valid" }, { status: 400 });
    }

    const price = Math.floor(Number(body.price));
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ success: false, error: "Harga tidak valid" }, { status: 400 });
    }

    const durationDays = Math.floor(Number(body.durationDays) || 14);
    if (!(durationDays > 0)) {
      return NextResponse.json({ success: false, error: "Durasi hari tidak valid" }, { status: 400 });
    }

    const productType: ProductType =
      (PRODUCT_TYPES as readonly string[]).includes(body.productType ?? "")
        ? (body.productType as ProductType)
        : "TOKEN_PACKAGE";

    const sort = Math.floor(Number(body.sort) || 0);
    const stock = Math.max(0, Math.floor(Number(body.stock) || 0));
    const isActive = body.isActive !== false;

    // Model khusus: array modelId yang boleh dipakai key paket ini.
    // Kosong = semua model paket boleh.
    let allowedModels: string[] = [];
    if (body.allowedModels !== undefined) {
      if (!Array.isArray(body.allowedModels) || body.allowedModels.some((m) => typeof m !== "string")) {
        return NextResponse.json(
          { success: false, error: "allowedModels harus berupa array string" },
          { status: 400 },
        );
      }
      allowedModels = (body.allowedModels as string[]).map((m) => m.trim()).filter(Boolean);
    }

    const created = await prisma.package.create({
      data: {
        name,
        description: body.description?.trim() || null,
        tokenQuota,
        price,
        durationDays,
        sort,
        stock,
        productType,
        isActive,
        allowedModels,
      },
    });

    await writeAuditLog({ actorUserId: actorId, action: "package.create", target: created.id });

    return NextResponse.json({ success: true, package: created });
  } catch (e) {
    console.error("[admin/packages POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
