import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { approvePaidOrder, WALLET_TOPUP_PACKAGE_ID } from "@/app/lib/order-approval";

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
      orderId: string;
      packageId: string;
      userId: string;
      action: "approve" | "reject";
      note: string;
      masterApiKey?: string;
    };

    const { orderId, action, note, masterApiKey } = body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Order sudah diproses" }, { status: 400 });
    }

    const isWalletTopUp = order.packageId === WALLET_TOPUP_PACKAGE_ID;

    if (action === "reject") {
      // Idempotent reject: only flip PENDING -> REJECTED.
      const claim = await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "REJECTED", adminNote: note || "Ditolak admin" },
      });
      if (claim.count > 0 && !isWalletTopUp) {
        // Restock only for package orders (wallet top-ups never decremented stock).
        await prisma.package.update({
          where: { id: order.packageId },
          data: { stock: { increment: 1 } },
        }).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    const result = await approvePaidOrder(orderId, "persetujuan admin");
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    if (note) {
      await prisma.order.update({ where: { id: orderId }, data: { adminNote: note } });
    }
    return NextResponse.json({ success: true, alreadyProcessed: result.alreadyProcessed });
  } catch (e) {
    console.error("[admin/decide] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
