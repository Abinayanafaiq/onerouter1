import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  verifyWebhookSignature,
  getPaymentStatus,
  isPaymentFinished,
  type NowpaymentsIpnPayload,
} from "@/app/lib/nowpayments";
import { approvePaidOrder } from "@/app/lib/order-approval";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const sig = request.headers.get("x-nowpayments-sig") || "";

    if (!sig) {
      console.error("[nowpayments/webhook] REJECTED: missing x-nowpayments-sig header");
      return NextResponse.json({ error: "Missing signature" }, { status: 403 });
    }

    if (!(await verifyWebhookSignature(rawBody, sig))) {
      console.error("[nowpayments/webhook] REJECTED: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const event = JSON.parse(rawBody) as NowpaymentsIpnPayload;

    const orderId = event.order_id;
    const status = event.payment_status || "";
    const invoiceId =
      event.invoice_id !== undefined ? String(event.invoice_id) : undefined;
    const paymentId =
      event.payment_id !== undefined ? String(event.payment_id) : undefined;

    console.log(
      "[nowpayments/webhook] received: orderId=%s invoiceId=%s paymentId=%s status=%s",
      orderId,
      invoiceId,
      paymentId,
      status,
    );

    if (!orderId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (!isPaymentFinished(status)) {
      return NextResponse.json({ ok: true, ignored: true, status });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (order.status === "APPROVED") {
      return NextResponse.json({ ok: true, alreadyApproved: true });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (invoiceId && order.nowpaymentsInvoiceId && order.nowpaymentsInvoiceId !== invoiceId) {
      console.error(
        "[nowpayments/webhook] invoice id mismatch: db=%s ipn=%s",
        order.nowpaymentsInvoiceId,
        invoiceId,
      );
      return NextResponse.json({ error: "Invoice mismatch" }, { status: 400 });
    }

    const paymentIdToCheck = paymentId || order.nowpaymentsPaymentId;
    if (paymentIdToCheck) {
      const remote = await getPaymentStatus(paymentIdToCheck);
      if (!remote || !remote.finished) {
        console.error(
          "[nowpayments/webhook] re-check not finished: paymentId=%s remote=%s",
          paymentIdToCheck,
          remote?.paymentStatus,
        );
        return NextResponse.json({ error: "Not confirmed remotely" }, { status: 202 });
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        nowpaymentsPaymentId: paymentId || order.nowpaymentsPaymentId,
      },
    });

    const approved = await approvePaidOrder(order.id, "NOWPayments");
    if (!approved.ok) {
      return NextResponse.json({ error: approved.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, approved: true, orderId: order.id });
  } catch (e) {
    console.error("[nowpayments/webhook] exception:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
