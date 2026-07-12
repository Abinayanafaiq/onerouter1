import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUsageLogs } from "@/app/lib/usage-stats";

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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const model = searchParams.get("model");
    const provider = searchParams.get("provider");
    const status = searchParams.get("status");

    const result = await getUsageLogs({
      userId,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      from,
      to,
      model: model || null,
      provider: provider || null,
      status: status || null,
    });

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[usage/logs] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
