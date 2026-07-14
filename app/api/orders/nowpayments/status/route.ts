import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getPaymentStatus } from "@/app/lib/nowpayments";
import { approvePaidOrder } from "@/app/lib/order-approval";

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
    if (order.paymentMethod !== "NOWPAYMENTS") {
      return NextResponse.json({ success: false, error: "Bukan order NOWPayments" }, { status: 400 });
    }

    if (order.status === "APPROVED") {
      return NextResponse.json({ success: true, status: "APPROVED" });
    }
    if (order.status === "CANCELLED" || order.status === "REJECTED") {
      return NextResponse.json({ success: true, status: order.status });
    }

    if (!order.nowpaymentsPaymentId) {
      return NextResponse.json({ success: true, status: "PENDING", note: "payment_id not yet assigned" });
    }

    const remote = await getPaymentStatus(order.nowpaymentsPaymentId);
    if (!remote) {
      return NextResponse.json({ success: true, status: "PENDING", note: "remote check failed" });
    }

    if (remote.finished) {
      console.log(`[nowpayments/status] payment finished, crediting order=${order.id}`);
      const approved = await approvePaidOrder(order.id, "NOWPayments");
      if (!approved.ok) {
        console.error(`[nowpayments/status] crediting failed order=${order.id}:`, approved.error);
        return NextResponse.json({ success: true, status: "PENDING", note: approved.error });
      }
      return NextResponse.json({ success: true, status: "APPROVED" });
    }

    if (remote.paymentStatus === "expired" || remote.paymentStatus === "failed") {
      await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    return NextResponse.json({ success: true, status: "PENDING", paymentStatus: remote.paymentStatus });
  } catch (e) {
    console.error("[nowpayments/status] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
