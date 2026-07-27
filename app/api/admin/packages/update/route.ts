import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      id: string;
      stock?: number;
      isActive?: boolean;
      price?: number;
    };

    const { id, stock, isActive, price } = body;

    const data: Record<string, unknown> = {};
    if (typeof stock === "number") data.stock = Math.max(0, Math.floor(stock));
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (typeof price === "number") {
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ success: false, error: "Harga tidak valid" }, { status: 400 });
      }
      data.price = Math.floor(price);
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

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/packages/update] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}