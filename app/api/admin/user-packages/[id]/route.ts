import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { writeAuditLog } from "@/app/lib/audit-log";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_MUTATION_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Admin actions on a user's TOKEN_PACKAGE API key ("paket user"):
 *
 *   { action: "extend",     days: number }    -> tambah masa aktif.
 *        Kedaluwarsa baru = max(sekarang, expiresAt lama) + days.
 *        Jadi paket yang sudah expired diperpanjang mulai dari sekarang,
 *        paket yang masih aktif diperpanjang dari tanggal berakhirnya.
 *   { action: "addQuota",   tokens: number }  -> tambah kuota token.
 *   { action: "setEnabled", enabled: boolean }-> aktifkan / matikan paket.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const actorId = (session.user as { id?: string }).id ?? null;

    const rl = checkRateLimit(`admin-user-packages:${actorId ?? "anon"}`, ADMIN_MUTATION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for admin mutations" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.billingMode !== "TOKEN_PACKAGE") {
      return NextResponse.json(
        { success: false, error: "Paket user tidak ditemukan" },
        { status: 404 },
      );
    }

    switch (body.action) {
      case "extend": {
        const days = Number(body.days);
        if (!Number.isInteger(days) || days < 1 || days > 3650) {
          return NextResponse.json(
            { success: false, error: "days harus bilangan bulat 1–3650" },
            { status: 400 },
          );
        }
        const base = Math.max(Date.now(), key.expiresAt?.getTime() ?? 0);
        const expiresAt = new Date(base + days * DAY_MS);
        const updated = await prisma.apiKey.update({
          where: { id },
          data: { expiresAt },
          select: { expiresAt: true },
        });
        await writeAuditLog({
          actorUserId: actorId,
          action: "userPackage.extend",
          target: `${id} (+${days} hari, berakhir ${expiresAt.toISOString()})`,
        });
        return NextResponse.json({
          success: true,
          expiresAt: updated.expiresAt?.toISOString() ?? null,
        });
      }

      case "addQuota": {
        const tokens = Number(body.tokens);
        if (!Number.isInteger(tokens) || tokens < 1 || tokens > 1_000_000_000_000) {
          return NextResponse.json(
            { success: false, error: "tokens harus bilangan bulat positif" },
            { status: 400 },
          );
        }
        const updated = await prisma.apiKey.update({
          where: { id },
          data: { tokenQuota: { increment: BigInt(tokens) } },
          select: { tokenQuota: true },
        });
        await writeAuditLog({
          actorUserId: actorId,
          action: "userPackage.addQuota",
          target: `${id} (+${tokens} token, kuota ${updated.tokenQuota.toString()})`,
        });
        return NextResponse.json({
          success: true,
          tokenQuota: updated.tokenQuota.toString(),
        });
      }

      case "setEnabled": {
        if (typeof body.enabled !== "boolean") {
          return NextResponse.json(
            { success: false, error: "enabled (boolean) required" },
            { status: 400 },
          );
        }
        await prisma.apiKey.update({
          where: { id },
          data: { enabled: body.enabled },
          select: { id: true },
        });
        await writeAuditLog({
          actorUserId: actorId,
          action: body.enabled ? "userPackage.enable" : "userPackage.disable",
          target: id,
        });
        return NextResponse.json({ success: true, enabled: body.enabled });
      }

      default:
        return NextResponse.json(
          { success: false, error: "action harus extend | addQuota | setEnabled" },
          { status: 400 },
        );
    }
  } catch (e) {
    console.error("[admin/user-packages/[id] PATCH] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
