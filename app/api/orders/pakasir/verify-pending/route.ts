import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  createTransaction,
  getTransactionStatus,
  type PakasirMethod,
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
    // otomatis canceled setelah 1x24 jam, jadi order lama pasti expired.
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
      // API v2: cek status butuh txn_id (tersimpan di pakasirPaymentNumber).
      // Jika kosong, pulihkan via create-transaction (find-or-create).
      let txnId = order.pakasirPaymentNumber;
      if (!txnId) {
        const recovered = await createTransaction({
          method: (order.pakasirMethod as PakasirMethod | null) ?? "qris",
          orderId: order.id,
          amount: order.amount,
        });
        if (!recovered.ok) continue;
        txnId = recovered.transaction.txn_id;
        await prisma.order.update({
          where: { id: order.id },
          data: {
            pakasirPaymentNumber: txnId,
            pakasirExpiredAt: recovered.transaction.expired_at
              ? new Date(recovered.transaction.expired_at)
              : null,
          },
        });
      }

      const detail = await getTransactionStatus({ txnId });
      if (!detail.ok) continue;

      if (detail.transaction.status === "completed") {
        const res = await approvePaidOrder(
          order.id,
          `Pakasir/${order.pakasirMethod || "qris"}`,
        );
        if (res.ok) approved++;
      } else if (detail.transaction.status === "canceled") {
        const r = await prisma.order.updateMany({
          where: { id: order.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        if (r.count > 0) cancelled++;
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
