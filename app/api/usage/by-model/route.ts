import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUsageByModel } from "@/app/lib/usage-stats";

export const dynamic = "force-dynamic";

function parseDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));

    const rows = await getUsageByModel(userId, { from, to });
    return NextResponse.json(
      { success: true, rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[usage/by-model] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
