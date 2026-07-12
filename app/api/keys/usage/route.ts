import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getAllApiKeyStats } from "@/app/lib/api-keys";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { stats, remainingBalance } = await getAllApiKeyStats(userId);
    return NextResponse.json(
      { success: true, stats, remainingBalance },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[keys/usage] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
