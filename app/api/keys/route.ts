import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { listApiKeys, createApiKey } from "@/app/lib/api-keys";
import { getWalletBalance } from "@/app/lib/wallet";

export const dynamic = "force-dynamic";

const MAX_KEYS_PER_USER = 25;

export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const keys = await listApiKeys(userId);
    return NextResponse.json({ success: true, keys }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[keys GET] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }
    if (name.length > 60) {
      return NextResponse.json({ success: false, error: "Name too long (max 60)" }, { status: 400 });
    }

    const { prisma } = await import("@/app/lib/prisma");
    const count = await prisma.apiKey.count({ where: { userId } });
    if (count >= MAX_KEYS_PER_USER) {
      return NextResponse.json(
        { success: false, error: `Maximum of ${MAX_KEYS_PER_USER} API keys reached` },
        { status: 400 },
      );
    }

    // Security: block key generation for accounts with no credit balance.
    // A zero balance means the user has never topped up (or has exhausted
    // their credit). Requiring balance > 0 prevents free accounts from
    // minting usable API keys. This is a read-only wallet check — it never
    // creates or mutates the wallet row.
    const balance = await getWalletBalance(userId);
    if (balance <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Isi saldo terlebih dahulu untuk membuat API key.",
          code: "insufficient_balance",
        },
        { status: 402 },
      );
    }

    let expiresAt: Date | null = null;
    if (body.expiresAt) {
      const d = new Date(String(body.expiresAt));
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ success: false, error: "Invalid expiresAt" }, { status: 400 });
      }
      expiresAt = d;
    }

    let rateLimit: number | null = null;
    if (body.rateLimit !== undefined && body.rateLimit !== null && body.rateLimit !== "") {
      const n = Number(body.rateLimit);
      if (!Number.isFinite(n) || n <= 0) {
        return NextResponse.json({ success: false, error: "Invalid rateLimit" }, { status: 400 });
      }
      rateLimit = Math.floor(n);
    }

    const result = await createApiKey({
      userId,
      name,
      expiresAt,
      ipWhitelist: parseStringArray(body.ipWhitelist),
      rateLimit,
      allowedModels: parseStringArray(body.allowedModels),
    });

    // plaintext returned exactly once
    return NextResponse.json({
      success: true,
      key: result.view,
      plaintext: result.plaintext,
    });
  } catch (e) {
    console.error("[keys POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
