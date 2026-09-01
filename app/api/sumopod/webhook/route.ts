import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  getSumopodSettings,
  amountMatchesOrder,
  verifySvixSignature,
  verifyWebhookToken,
  type SumopodWebhookPayload,
} from "@/app/lib/sumopod";
import { approvePaidOrder } from "@/app/lib/order-approval";

/**
 * Webhook Sumopod.
 *
 * Catatan: API publik Sumopod hanya punya "create payment" — tidak ada
 * endpoint detail/status payment, jadi keaslian webhook sepenuhnya
 * mengandalkan verifikasi Svix signature (whsec_...) atau X-Webhook-Token
 * (whtok_...). Minimal salah satu HARUS dikonfigurasi; request tanpa
 * verifikasi valid selalu ditolak.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const settings = await getSumopodSettings();

    console.log("[sumopod/webhook] event received:", rawBody.slice(0, 300));

    // 1. Verifikasi keaslian webhook.
    let verified = false;
    if (settings.webhookSecret) {
      verified = verifySvixSignature({
        secret: settings.webhookSecret,
        svixId: request.headers.get("svix-id") || "",
        svixTimestamp: request.headers.get("svix-timestamp") || "",
        svixSignature: request.headers.get("svix-signature") || "",
        rawBody,
      });
      if (!verified) {
        console.error("[sumopod/webhook] REJECTED: invalid svix signature");
      }
    } else if (settings.webhookToken) {
      verified = verifyWebhookToken(
        settings.webhookToken,
        request.headers.get("x-webhook-token"),
      );
      if (!verified) {
        console.error("[sumopod/webhook] REJECTED: invalid webhook token");
      }
    } else {
      console.error(
        "[sumopod/webhook] REJECTED: webhook secret/token belum dikonfigurasi",
      );
      return NextResponse.json(
        { error: "Webhook belum dikonfigurasi" },
        { status: 503 },
      );
    }
    if (!verified) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const event = JSON.parse(rawBody) as SumopodWebhookPayload;
    const data = event?.data;

    // Event test dari halaman Settings Sumopod.
    if (event.event_type === "payment.test") {
      return NextResponse.json({ ok: true, test: true });
    }

    if (!data?.order_id || !data?.payment_id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const order = await prisma.order.findFirst({
      where: { id: data.order_id, paymentMethod: "SUMOPOD" },
    });
    if (!order) {
      console.log(`[sumopod/webhook] order not found: ${data.order_id}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    // 2. Payment gagal / kadaluarsa: batalkan order yang masih PENDING.
    if (event.event_type === "payment.failed" || event.event_type === "payment.expired") {
      const r = await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED", adminNote: `Sumopod: ${event.event_type}` },
      });
      console.log(`[sumopod/webhook] ${event.event_type}, cancelled=${r.count} order=${order.id}`);
      return NextResponse.json({ ok: true, cancelled: r.count > 0 });
    }

    if (event.event_type !== "payment.completed") {
      console.log(`[sumopod/webhook] ignored: event=${event.event_type}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (order.status === "APPROVED") {
      console.log(`[sumopod/webhook] already approved (idempotent): ${order.id}`);
      return NextResponse.json({ ok: true, alreadyApproved: true });
    }

    // 3. Validasi amount (toleran fee-on-top: amount/net_amount/amount-fee).
    if (!amountMatchesOrder(data, order.amount)) {
      console.error(
        `[sumopod/webhook] amount mismatch: webhook amount=${data.amount} fee=${data.fee} net=${data.net_amount} order=${order.amount} orderId=${order.id}`,
      );
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // 4. Kredit secara atomik & idempoten.
    const paymentMethodLabel = `Sumopod/${data.payment_method || "qris"}`;
    const approved = await approvePaidOrder(order.id, paymentMethodLabel);
    if (!approved.ok) {
      // Jangan laporkan sukses — biarkan Sumopod retry webhook.
      return NextResponse.json({ error: approved.error }, { status: 500 });
    }

    console.log(`[sumopod/webhook] approved order=${order.id}`);
    return NextResponse.json({ ok: true, approved: true, orderId: order.id });
  } catch (e) {
    console.error("[sumopod/webhook] exception:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
