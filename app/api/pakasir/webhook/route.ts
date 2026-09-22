import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  verifyWebhookSecret,
  getTransactionStatus,
  getPakasirSettings,
  type PakasirWebhookPayload,
} from "@/app/lib/pakasir";
import { approvePaidOrder } from "@/app/lib/order-approval";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const secretHeader = request.headers.get("X-Secret") || "";
    const settings = await getPakasirSettings();

    console.log("[pakasir/webhook] payment received:", rawBody.slice(0, 300));

    // 1. Verifikasi X-Secret (API v2). Jika secret dikonfigurasi, header wajib
    //    cocok. Jika belum dikonfigurasi, webhook tetap diamankan via
    //    re-verifikasi API pada langkah 3 di bawah.
    if (settings.webhookSecret) {
      if (!(await verifyWebhookSecret(secretHeader))) {
        console.error("[pakasir/webhook] REJECTED: invalid X-Secret");
        return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
      }
    } else {
      console.warn("[pakasir/webhook] webhookSecret belum diset — hanya mengandalkan re-verifikasi API");
    }

    const event = JSON.parse(rawBody) as PakasirWebhookPayload;

    if (!event.order_id) {
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

    // 3. Server-side re-verification via the status API (never trust the
    //    webhook body alone). txn_id diambil dari payload webhook, fallback ke
    //    yang tersimpan di order (kolom pakasirPaymentNumber menyimpan txn_id).
    const txnId = event.txn_id || order.pakasirPaymentNumber || "";
    if (!txnId) {
      console.error(`[pakasir/webhook] no txn_id available for order=${order.id}`);
      return NextResponse.json({ error: "Missing txn_id" }, { status: 400 });
    }
    if (order.pakasirPaymentNumber && event.txn_id && event.txn_id !== order.pakasirPaymentNumber) {
      console.warn(
        `[pakasir/webhook] txn_id mismatch: webhook=${event.txn_id} stored=${order.pakasirPaymentNumber} order=${order.id}`,
      );
    }

    const detail = await getTransactionStatus({ txnId });
    if (
      !detail.ok ||
      detail.transaction.status !== "completed" ||
      detail.transaction.order_id !== order.id ||
      detail.transaction.amount !== order.amount
    ) {
      console.error(
        "[pakasir/webhook] verification failed:",
        detail.ok ? JSON.stringify(detail.transaction) : detail.error,
      );
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }
    console.log(`[pakasir/webhook] payment verified for order=${order.id}`);

    // 4. Credit atomically & idempotently.
    const paymentMethodLabel = `Pakasir/${order.pakasirMethod || "qris"}`;
    const approved = await approvePaidOrder(order.id, paymentMethodLabel);
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
