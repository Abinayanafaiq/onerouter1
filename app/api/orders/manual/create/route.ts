import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = (await request.json()) as { packageId: string; whatsapp?: string };

    if (!body.packageId) {
      return NextResponse.json({ success: false, error: "Package ID diperlukan" }, { status: 400 });
    }

    if (!body.whatsapp || !body.whatsapp.trim()) {
      return NextResponse.json({ success: false, error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
    }

    const pkg = await findPackage(body.packageId);
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 404 });
    }

    if (pkg.stock <= 0) {
      return NextResponse.json({ success: false, error: "Stok habis" }, { status: 400 });
    }

    await prisma.order.create({
      data: {
        userId,
        packageId: body.packageId,
        amount: pkg.price,
        whatsapp: body.whatsapp.trim(),
        paymentMethod: "MANUAL",
        status: "PENDING",
      },
    });

    await prisma.package.update({
      where: { id: body.packageId },
      data: { stock: { decrement: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[manual/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
