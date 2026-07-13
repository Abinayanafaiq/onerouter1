import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { normalizeWhatsApp } from "@/app/lib/whatsapp";

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

    let whatsapp: string | null = null;
    if (body.whatsapp !== undefined && body.whatsapp !== null) {
      const raw = typeof body.whatsapp === "string" ? body.whatsapp : String(body.whatsapp);
      if (raw.trim() === "") {
        whatsapp = null;
      } else {
        const normalized = normalizeWhatsApp(raw);
        if (!normalized) {
          return NextResponse.json(
            { success: false, error: "Format WhatsApp tidak valid (digit 8-15, + opsional)" },
            { status: 400 },
          );
        }
        whatsapp = normalized;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { whatsapp },
      select: { id: true, whatsapp: true },
    });

    return NextResponse.json({ success: true, whatsapp: updated.whatsapp });
  } catch (e) {
    console.error("[admin/users/[userId]/whatsapp PATCH] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
