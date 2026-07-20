import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { InvalidImageError, normalizeUploadedImage } from "@/app/lib/image-upload";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const orderId = formData.get("orderId") as string;
    const file = formData.get("proof") as File | null;

    if (!orderId || !file) {
      return NextResponse.json({ success: false, error: "Order ID dan file diperlukan" }, { status: 400 });
    }

    // Verify the order belongs to the authenticated user (ownership check).
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.userId !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Order sudah diproses" }, { status: 400 });
    }

    const base64 = await normalizeUploadedImage(file);

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProof: base64,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof InvalidImageError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
    console.error("[manual/upload] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
