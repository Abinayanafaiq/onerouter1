import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json() as {
      id?: string;
      enabled?: boolean;
      supportsStreaming?: boolean;
    };
    if (!body.id) return NextResponse.json({ success: false, error: "ID diperlukan" }, { status: 400 });
    if (body.enabled === undefined && body.supportsStreaming === undefined) {
      return NextResponse.json({ success: false, error: "Tidak ada perubahan" }, { status: 400 });
    }

    await prisma.packageModel.update({
      where: { id: body.id },
      data: {
        ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
        ...(typeof body.supportsStreaming === "boolean" ? { supportsStreaming: body.supportsStreaming } : {}),
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/package-models/update]", error);
    return NextResponse.json({ success: false, error: "Model paket tidak ditemukan" }, { status: 404 });
  }
}
