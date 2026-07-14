import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getNowpaymentsSettings,
  saveNowpaymentsSettings,
} from "@/app/lib/nowpayments";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const settings = await getNowpaymentsSettings();
    const maskedApiKey = settings.apiKey
      ? `${settings.apiKey.slice(0, 4)}${"*".repeat(Math.max(0, settings.apiKey.length - 8))}${settings.apiKey.slice(-4)}`
      : "";
    return NextResponse.json({
      success: true,
      apiKeyMasked: maskedApiKey,
      apiKeySet: !!settings.apiKey,
      ipnSecretSet: !!settings.ipnSecret,
      sandbox: settings.sandbox,
    });
  } catch (e) {
    console.error("[admin/settings/nowpayments GET] exception:", e);
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

    const body = (await request.json()) as {
      apiKey?: string;
      ipnSecret?: string;
      sandbox?: boolean;
      clearIpnSecret?: boolean;
    };

    const update: {
      apiKey?: string;
      ipnSecret?: string;
      sandbox?: boolean;
    } = {};

    if (body.apiKey !== undefined && body.apiKey.trim() !== "") {
      update.apiKey = body.apiKey.trim();
    }

    if (body.clearIpnSecret) {
      update.ipnSecret = "";
    } else if (body.ipnSecret !== undefined && body.ipnSecret.trim() !== "") {
      update.ipnSecret = body.ipnSecret.trim();
    }

    if (body.sandbox !== undefined) {
      update.sandbox = body.sandbox;
    }

    await saveNowpaymentsSettings(update);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/settings/nowpayments POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
