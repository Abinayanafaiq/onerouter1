import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyWebhookSignature } from "@/app/lib/btcpay";
import { approvePaidOrder } from "@/app/lib/order-approval";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const sig = request.headers.get("BTCPay-Sig") || "";
    const secret = process.env.BTCPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[btcpay/webhook] REJECTED: BTCPAY_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 403 },
      );
    }

    if (!verifyWebhookSignature(rawBody, sig)) {
      console.error("[btcpay/webhook] REJECTED: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const event = JSON.parse(rawBody) as {
      type?: string;
      invoiceId?: string;
      metadata?: { orderId?: string };
    };

    if (!event.invoiceId || event.type !== "InvoiceSettled") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const order = await prisma.order.findFirst({
      where: { btcpayInvoiceId: event.invoiceId },
    });

    if (!order) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (order.status === "APPROVED") {
      return NextResponse.json({ ok: true, alreadyApproved: true });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Credit atomically & idempotently (single source of truth).
    const approved = await approvePaidOrder(order.id, "BTCPay");
    if (!approved.ok) {
      // Do NOT report success — let BTCPay retry the webhook.
      return NextResponse.json({ error: approved.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, approved: true, orderId: order.id });
  } catch (e) {
    console.error("[btcpay/webhook] exception:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}