import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

/**
 * Polling status order Sumopod dari form checkout / top-up.
 *
 * API Sumopod tidak punya endpoint cek status, jadi sumber kebenaran adalah
 * DB lokal yang di-update webhook (/api/sumopod/webhook). Satu-satunya
 * transisi yang bisa diputuskan lokal: payment link yang sudah lewat
 * sumopodExpiredAt pasti expired -> batalkan order yang masih PENDING.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Harap login" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId diperlukan" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      return NextResponse.json({ success: false, error: "Order tidak ditemukan" }, { status: 404 });
    }
    if (order.paymentMethod !== "SUMOPOD") {
      return NextResponse.json({ success: false, error: "Bukan order Sumopod" }, { status: 400 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ success: true, status: order.status });
    }

    // Expired lokal: payment link Sumopod sudah lewat masa berlakunya.
    if (order.sumopodExpiredAt && order.sumopodExpiredAt.getTime() < Date.now()) {
      const r = await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED", adminNote: "Payment link Sumopod expired" },
      });
      if (r.count > 0) {
        return NextResponse.json({ success: true, status: "CANCELLED" });
      }
    }

    return NextResponse.json({ success: true, status: "PENDING" });
  } catch (e) {
    console.error("[sumopod/status] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
