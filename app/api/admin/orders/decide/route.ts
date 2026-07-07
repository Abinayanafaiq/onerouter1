import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { generateApiKey } from "@/app/lib/apikey";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json()) as {
      orderId: string;
      packageId: string;
      userId: string;
      action: "approve" | "reject";
      note: string;
      masterApiKey?: string;
    };

    const { orderId, userId, action, note, masterApiKey } = body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Order sudah diproses" }, { status: 400 });
    }

    if (action === "reject") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "REJECTED", adminNote: note || "Ditolak admin" },
      });
      await prisma.package.update({
        where: { id: order.packageId },
        data: { stock: { increment: 1 } },
      }).catch(() => {});
      return NextResponse.json({ success: true });
    }

    if (!masterApiKey || masterApiKey.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Master API key wajib diisi saat approve" },
        { status: 400 },
      );
    }

    const pkg = await prisma.package.findUnique({ where: { id: order.packageId } });
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);

    const { key, keyHash } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        key,
        keyHash,
        masterApiKey: masterApiKey.trim(),
        label: `${pkg.name} - ${order.paymentMethod}`,
        tokenQuota: pkg.tokenQuota,
        expiresAt,
        isActive: true,
        lastResetDay: now,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "APPROVED",
        activatedAt: now,
        expiresAt,
        apiKeyId: apiKey.id,
        adminNote: note || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/decide] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}