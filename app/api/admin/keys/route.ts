import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { listAllApiKeys, getAdminKeyAnalytics } from "@/app/lib/admin-api-keys";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const withAnalytics = searchParams.get("analytics") === "1";

    const [keys, analytics] = await Promise.all([
      listAllApiKeys(),
      withAnalytics ? getAdminKeyAnalytics() : null,
    ]);

    return NextResponse.json(
      { success: true, keys, ...(analytics ? { analytics } : {}) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[admin/keys GET] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
