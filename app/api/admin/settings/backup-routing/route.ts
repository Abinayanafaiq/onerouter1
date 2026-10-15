import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getBackupRoutingMap,
  saveBackupRoutingMap,
  resetBackupRoutingMap,
  validateBackupRoutingMap,
  getBackupUpstreamUrl,
  saveBackupUpstreamUrl,
  resetBackupUpstreamUrl,
  validateBackupUpstreamUrl,
  getExtraUpstreams,
  extraUpstreamModelOwners,
} from "@/app/lib/backup-routing";
import { BACKUP_API_URL, BACKUP_UPSTREAM_MODEL_MAP } from "@/app/lib/constants";

export const dynamic = "force-dynamic";

const DEFAULT_URL = BACKUP_API_URL.replace(/\/+$/, "");

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const [{ map, source }, { url, source: urlSource }] = await Promise.all([
      getBackupRoutingMap(),
      getBackupUpstreamUrl(),
    ]);
    return NextResponse.json({
      success: true,
      map,
      source,
      url,
      urlSource,
      defaults: BACKUP_UPSTREAM_MODEL_MAP,
      defaultUrl: DEFAULT_URL,
    });
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

    const body = (await request.json()) as { map?: unknown; url?: unknown };
    const map = validateBackupRoutingMap(body.map);
    if (!map) {
      return NextResponse.json(
        { success: false, error: "Format map tidak valid: semua model ID dan upstream ID harus terisi" },
        { status: 400 },
      );
    }

    // Satu model publik hanya boleh di-route ke satu upstream.
    const extraOwners = extraUpstreamModelOwners(await getExtraUpstreams());
    for (const modelId of Object.keys(map)) {
      const owner = extraOwners.get(modelId);
      if (owner) {
        return NextResponse.json(
          { success: false, error: `Model "${modelId}" sudah dipakai di ${owner}` },
          { status: 400 },
        );
      }
    }

    // URL opsional — kalau dikirim, wajib valid; kalau tidak dikirim, setting
    // URL yang ada dibiarkan apa adanya.
    let url: string | null = null;
    let urlSource: "database" | "default" | undefined;
    if (body.url !== undefined) {
      url = validateBackupUpstreamUrl(body.url);
      if (!url) {
        return NextResponse.json(
          { success: false, error: "URL backup tidak valid: harus diawali http:// atau https://" },
          { status: 400 },
        );
      }
    }

    await saveBackupRoutingMap(map);
    if (url !== null) {
      await saveBackupUpstreamUrl(url);
      urlSource = "database";
    } else {
      const current = await getBackupUpstreamUrl();
      url = current.url;
      urlSource = current.source;
    }
    return NextResponse.json({ success: true, map, source: "database", url, urlSource });
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
    await Promise.all([resetBackupRoutingMap(), resetBackupUpstreamUrl()]);
    return NextResponse.json({
      success: true,
      map: BACKUP_UPSTREAM_MODEL_MAP,
      source: "default",
      url: DEFAULT_URL,
      urlSource: "default",
    });
  } catch (e) {
    console.error("[admin/settings/backup-routing DELETE] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
