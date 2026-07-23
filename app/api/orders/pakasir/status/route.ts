import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  getTransactionDetail,
  checkTransactionCompletedViaCreate,
} from "@/app/lib/pakasir";
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
    if (order.paymentMethod !== "PAKASIR") {
      return NextResponse.json({ success: false, error: "Bukan order Pakasir" }, { status: 400 });
    }

    if (order.status === "APPROVED") {
      return NextResponse.json({ success: true, status: "APPROVED" });
    }
    if (order.status === "CANCELLED" || order.status === "REJECTED") {
      return NextResponse.json({ success: true, status: order.status });
    }

    const detail = await getTransactionDetail({ orderId: order.id, amount: order.amount });
    if (!detail.ok) {
      // Fallback: transactiondetail returns 404 untuk URL-integration transactions.
      // Cek via createTransaction — jika "already completed", transaksi sudah dibayar.
      const fallback = await checkTransactionCompletedViaCreate({
        orderId: order.id,
        amount: order.amount,
      });
      if (fallback.completed) {
        console.log(`[pakasir/status] payment completed (fallback), crediting order=${order.id}`);
        const approved = await approvePaidOrder(
          order.id,
          `Pakasir/${order.pakasirMethod || "qris"}`,
        );
        if (!approved.ok) {
          return NextResponse.json({ success: true, status: "PENDING", note: approved.error });
        }
        return NextResponse.json({ success: true, status: "APPROVED" });
      }
      return NextResponse.json({ success: true, status: "PENDING", note: detail.error });
    }

    if (detail.transaction.status === "completed") {
      // Payment is verified as completed by Pakasir. Credit the wallet here so
      // the flow works even when the webhook is not reachable. This is fully
      // idempotent — if the webhook already processed it, approvePaidOrder
      // detects the APPROVED state and skips double-crediting.
      console.log(`[pakasir/status] payment completed, crediting order=${order.id}`);
      const approved = await approvePaidOrder(
        order.id,
        `Pakasir/${detail.transaction.payment_method || order.pakasirMethod || "qris"}`,
      );
      if (!approved.ok) {
        console.error(`[pakasir/status] crediting failed order=${order.id}:`, approved.error);
        // Report still-pending so the client keeps polling and retries.
        return NextResponse.json({ success: true, status: "PENDING", note: approved.error });
      }
      return NextResponse.json({ success: true, status: "APPROVED" });
    }
    if (detail.transaction.status === "expired" || detail.transaction.status === "cancelled") {
      await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    return NextResponse.json({ success: true, status: "PENDING" });
  } catch (e) {
    console.error("[pakasir/status] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
