import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getWalletSummary } from "@/app/lib/usage-stats";
import { prisma } from "@/app/lib/prisma";
import { idrToToks } from "@/app/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // ?lite=1: saldo saja (satu lookup by primary key). CreditBadge memanggil
    // ini berkala dari setiap tab dashboard; summary lengkap menjumlahkan
    // seluruh UsageLog user dan jadi query terberat di database.
    if (new URL(req.url).searchParams.get("lite") === "1") {
      // Langsung ke DB (bukan getWalletBalance yang mengembalikan 0 saat pool
      // penuh): kalau gagal, badge cukup menyimpan nilai lamanya.
      const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });
      const balance = Number(wallet?.balance ?? 0);
      return NextResponse.json(
        { success: true, summary: { balance, balanceToks: idrToToks(balance) } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const summary = await getWalletSummary(userId);
    return NextResponse.json(
      { success: true, summary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[wallet/summary] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
