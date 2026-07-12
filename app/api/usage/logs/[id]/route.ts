import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUsageLogById } from "@/app/lib/usage-stats";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const row = await getUsageLogById(userId, id);
    if (!row) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, row },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[usage/logs/[id]] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
