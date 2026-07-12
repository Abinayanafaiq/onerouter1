import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getApiRequestLogs } from "@/app/lib/api-request-log";

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
    const statusParam = searchParams.get("status");
    const success =
      statusParam === "success" ? true : statusParam === "failed" ? false : null;

    const result = await getApiRequestLogs({
      userId,
      apiKeyId: searchParams.get("apiKeyId") || null,
      model: searchParams.get("model") || null,
      provider: searchParams.get("provider") || null,
      success,
      from: parseDate(searchParams.get("from")),
      to: parseDate(searchParams.get("to")),
      search: searchParams.get("search") || null,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[keys/requests] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
