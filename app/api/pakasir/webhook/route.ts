import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  verifyWebhookSignature,
  getTransactionDetail,
  getPakasirSettings,
  type PakasirWebhookPayload,
} from "@/app/lib/pakasir";
import { approvePaidOrder } from "@/app/lib/order-approval";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const sig =
      request.headers.get("Pakasir-Sig") ||
      request.headers.get("X-Pakasir-Signature") ||
      "";
    const settings = await getPakasirSettings();

    console.log("[pakasir/webhook] payment received:", rawBody.slice(0, 300));

    // 1. Signature verification (optional — Pakasir does not sign webhooks).
    //    If a signature header IS present, verify it with the configured secret.
    //    If no signature header, skip HMAC and rely on the Transaction Detail
    //    API re-verification below (step 3) for authenticity.
    if (sig && settings.webhookSecret) {
      if (!(await verifyWebhookSignature(rawBody, sig))) {
        console.error("[pakasir/webhook] REJECTED: invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const event = JSON.parse(rawBody) as PakasirWebhookPayload;

    if (!event.order_id || !event.project) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (settings.slug && event.project !== settings.slug) {
      console.log("[pakasir/webhook] ignored: project mismatch");
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (event.status !== "completed") {
      console.log(`[pakasir/webhook] ignored: status=${event.status}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const order = await prisma.order.findFirst({
      where: { id: event.order_id, paymentMethod: "PAKASIR" },
    });
    if (!order) {
      console.log(`[pakasir/webhook] order not found: ${event.order_id}`);
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (order.status === "APPROVED") {
      console.log(`[pakasir/webhook] already approved (idempotent): ${order.id}`);
      return NextResponse.json({ ok: true, alreadyApproved: true });
    }

    // 2. Validate the amount matches our record.
    if (event.amount !== order.amount) {
      console.error(
        `[pakasir/webhook] amount mismatch: webhook=${event.amount} order=${order.amount} orderId=${order.id}`,
      );
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // 3. Server-side re-verification via the detail API (never trust the
    //    webhook body alone).
    const detail = await getTransactionDetail({ orderId: order.id, amount: order.amount });
    if (!detail.ok || detail.transaction.status !== "completed") {
      console.error(
        "[pakasir/webhook] verification via detail API failed:",
        detail.ok ? detail.transaction.status : detail.error,
      );
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }
    console.log(`[pakasir/webhook] payment verified for order=${order.id}`);

    // 4. Credit atomically & idempotently.
    const approved = await approvePaidOrder(
      order.id,
      `Pakasir/${event.payment_method || detail.transaction.payment_method}`,
    );
    if (!approved.ok) {
      // Do NOT report success — let Pakasir retry the webhook.
      return NextResponse.json({ error: approved.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, approved: true, orderId: order.id });
  } catch (e) {
    console.error("[pakasir/webhook] exception:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
