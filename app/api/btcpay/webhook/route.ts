import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { generateApiKey, hashKey } from "@/app/lib/apikey";
import { verifyWebhookSignature } from "@/app/lib/btcpay";

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

    if (!order || order.status !== "PENDING") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const pkg = await prisma.package.findUnique({ where: { id: order.packageId } });
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 500 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);

    const { key, keyHash: keyHashValue } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: order.userId,
        key,
        keyHash: keyHashValue,
        label: `${pkg.name} - ${order.paymentMethod}`,
        tokenQuota: pkg.tokenQuota,
        expiresAt,
        isActive: true,
        lastResetDay: now,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "APPROVED",
        activatedAt: now,
        expiresAt,
        apiKeyId: apiKey.id,
        adminNote: "Auto-approved via BTCPay webhook",
      },
    });

    return NextResponse.json({ ok: true, approved: true, orderId: order.id });
  } catch (e) {
    console.error("[btcpay/webhook] exception:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}