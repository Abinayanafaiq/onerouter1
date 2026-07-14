import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { checkPaymentOnChain, getBscSettings } from "@/app/lib/crypto-bsc";
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
    if (order.paymentMethod !== "CRYPTO_BSC") {
      return NextResponse.json({ success: false, error: "Bukan order crypto BSC" }, { status: 400 });
    }

    if (order.status === "APPROVED") {
      return NextResponse.json({ success: true, status: "APPROVED" });
    }
    if (order.status === "CANCELLED" || order.status === "REJECTED") {
      return NextResponse.json({ success: true, status: order.status });
    }

    const check = await checkPaymentOnChain(order.id);
    if (check.error) {
      return NextResponse.json({ success: true, status: "PENDING", note: check.error });
    }

    if (check.found && check.txHash) {
      const { confirmations: requiredConf } = await getBscSettings();
      const confs = check.confirmations ?? 0;
      if (confs >= requiredConf) {
        console.log(`[bsc/status] payment confirmed (${confs} confs), crediting order=${order.id}`);
        await prisma.order.update({
          where: { id: order.id },
          data: { adminNote: `Confirmed on-chain. TX: ${check.txHash}` },
        });
        const approved = await approvePaidOrder(order.id, "USDT BEP20");
        if (!approved.ok) {
          console.error(`[bsc/status] crediting failed order=${order.id}:`, approved.error);
          return NextResponse.json({ success: true, status: "PENDING", note: approved.error });
        }
        return NextResponse.json({
          success: true,
          status: "APPROVED",
          txHash: check.txHash,
          confirmations: confs,
        });
      }
      return NextResponse.json({
        success: true,
        status: "PENDING",
        txHash: check.txHash,
        confirmations: confs,
        requiredConfirmations: requiredConf,
      });
    }

    return NextResponse.json({ success: true, status: "PENDING" });
  } catch (e) {
    console.error("[bsc/status] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
