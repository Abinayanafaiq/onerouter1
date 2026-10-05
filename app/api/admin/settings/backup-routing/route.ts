import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getBackupRoutingMap,
  saveBackupRoutingMap,
  resetBackupRoutingMap,
  validateBackupRoutingMap,
} from "@/app/lib/backup-routing";
import { BACKUP_UPSTREAM_MODEL_MAP } from "@/app/lib/constants";

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
    const { map, source } = await getBackupRoutingMap();
    return NextResponse.json({ success: true, map, source, defaults: BACKUP_UPSTREAM_MODEL_MAP });
  } catch (e) {
    console.error("[admin/settings/backup-routing GET] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { map?: unknown };
    const map = validateBackupRoutingMap(body.map);
    if (!map) {
      return NextResponse.json(
        { success: false, error: "Format map tidak valid: semua model ID dan upstream ID harus terisi" },
        { status: 400 },
      );
    }

    await saveBackupRoutingMap(map);
    return NextResponse.json({ success: true, map, source: "database" });
  } catch (e) {
    console.error("[admin/settings/backup-routing POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    await resetBackupRoutingMap();
    return NextResponse.json({ success: true, map: BACKUP_UPSTREAM_MODEL_MAP, source: "default" });
  } catch (e) {
    console.error("[admin/settings/backup-routing DELETE] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
