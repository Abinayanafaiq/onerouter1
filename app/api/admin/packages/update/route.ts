import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json()) as {
      id: string;
      stock?: number;
      isActive?: boolean;
    };

    const { id, stock, isActive } = body;

    const data: Record<string, unknown> = {};
    if (typeof stock === "number") data.stock = Math.max(0, stock);
    if (typeof isActive === "boolean") data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada perubahan" }, { status: 400 });
    }

    await prisma.package.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/packages/update] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}