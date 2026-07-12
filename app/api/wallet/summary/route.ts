import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getWalletSummary } from "@/app/lib/usage-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
