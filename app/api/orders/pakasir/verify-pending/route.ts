import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  getTransactionDetail,
  checkTransactionCompletedViaCreate,
} from "@/app/lib/pakasir";
import { approvePaidOrder } from "@/app/lib/order-approval";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Harap login" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    // Hanya cek order PENDING dalam 24 jam terakhir — transaksi Pakasir
    // biasanya kadaluarsa dalam beberapa menit, jadi order lama pasti expired.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingOrders = await prisma.order.findMany({
      where: {
        userId,
        paymentMethod: "PAKASIR",
        status: "PENDING",
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    let approved = 0;
    let cancelled = 0;
    for (const order of pendingOrders) {
      // 1. Cek via transactiondetail API (utama — works untuk API-created transactions)
      const detail = await getTransactionDetail({
        orderId: order.id,
        amount: order.amount,
      });

      if (detail.ok) {
        if (detail.transaction.status === "completed") {
          const res = await approvePaidOrder(
            order.id,
            `Pakasir/${detail.transaction.payment_method || order.pakasirMethod || "qris"}`,
          );
          if (res.ok) approved++;
        } else if (
          detail.transaction.status === "expired" ||
          detail.transaction.status === "cancelled"
        ) {
          const r = await prisma.order.updateMany({
            where: { id: order.id, status: "PENDING" },
            data: { status: "CANCELLED" },
          });
          if (r.count > 0) cancelled++;
        }
        continue;
      }

      // 2. Fallback: jika transactiondetail 404 (terjadi untuk URL-integration
      //    transactions), cek via createTransaction — jika return "already
      //    completed", transaksi sudah dibayar.
      const fallback = await checkTransactionCompletedViaCreate({
        orderId: order.id,
        amount: order.amount,
      });
      if (fallback.completed) {
        const res = await approvePaidOrder(
          order.id,
          `Pakasir/${order.pakasirMethod || "qris"}`,
        );
        if (res.ok) approved++;
      }
    }

    return NextResponse.json({
      success: true,
      checked: pendingOrders.length,
      approved,
      cancelled,
    });
  } catch (e) {
    console.error("[pakasir/verify-pending] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
