import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    let rateLimit: number | null = null;
    if (body.rateLimit !== undefined && body.rateLimit !== null) {
      const raw = typeof body.rateLimit === "string" ? body.rateLimit.trim() : body.rateLimit;
      if (raw === "" || raw === 0 || raw === "0") {
        rateLimit = null;
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
          return NextResponse.json(
            { success: false, error: "rateLimit harus angka bulat >= 0" },
            { status: 400 },
          );
        }
        rateLimit = n === 0 ? null : n;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { rateLimit },
      select: { id: true, rateLimit: true },
    });

    return NextResponse.json({ success: true, rateLimit: updated.rateLimit });
  } catch (e) {
    console.error("[admin/users/[userId]/rate-limit PATCH] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
