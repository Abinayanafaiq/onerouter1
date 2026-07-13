import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getTelegramGroupUrl,
  setTelegramGroupUrl,
  clearTelegramGroupUrl,
  isValidTelegramUrl,
} from "@/app/lib/telegram";

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
    const url = await getTelegramGroupUrl();
    return NextResponse.json({ success: true, url });
  } catch (e) {
    console.error("[admin/settings/telegram GET] exception:", e);
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

    const body = (await request.json()) as { url?: string; clear?: boolean };

    if (body.clear) {
      await clearTelegramGroupUrl();
      return NextResponse.json({ success: true });
    }

    if (typeof body.url !== "string") {
      return NextResponse.json({ success: false, error: "url diperlukan" }, { status: 400 });
    }

    const trimmed = body.url.trim();
    if (trimmed && !isValidTelegramUrl(trimmed)) {
      return NextResponse.json(
        { success: false, error: "URL harus https://t.me/... atau https://telegram.me/..." },
        { status: 400 },
      );
    }

    await setTelegramGroupUrl(trimmed);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/settings/telegram POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
