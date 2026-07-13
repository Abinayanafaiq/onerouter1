import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getAuditLogs } from "@/app/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const logs = await getAuditLogs(100);
    return NextResponse.json({ success: true, logs });
  } catch (e) {
    console.error("[admin/audit-logs GET] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
