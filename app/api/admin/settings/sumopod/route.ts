import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getSumopodSettings, saveSumopodSettings } from "@/app/lib/sumopod";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const settings = await getSumopodSettings();
    const maskedApiKey = settings.apiKey
      ? `${settings.apiKey.slice(0, 4)}${"*".repeat(Math.max(0, settings.apiKey.length - 8))}${settings.apiKey.slice(-4)}`
      : "";
    return NextResponse.json({
      success: true,
      apiKeyMasked: maskedApiKey,
      apiKeySet: !!settings.apiKey,
      webhookTokenSet: !!settings.webhookToken,
      webhookSecretSet: !!settings.webhookSecret,
    });
  } catch (e) {
    console.error("[admin/settings/sumopod GET] exception:", e);
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
      webhookToken?: string;
      webhookSecret?: string;
      clearWebhookToken?: boolean;
      clearWebhookSecret?: boolean;
    };

    const update: {
      apiKey?: string;
      webhookToken?: string;
      webhookSecret?: string;
    } = {};

    if (body.apiKey !== undefined && body.apiKey.trim() !== "") {
      update.apiKey = body.apiKey.trim();
    }

    if (body.clearWebhookToken) {
      update.webhookToken = "";
    } else if (body.webhookToken !== undefined && body.webhookToken.trim() !== "") {
      update.webhookToken = body.webhookToken.trim();
    }

    if (body.clearWebhookSecret) {
      update.webhookSecret = "";
    } else if (body.webhookSecret !== undefined && body.webhookSecret.trim() !== "") {
      update.webhookSecret = body.webhookSecret.trim();
    }

    await saveSumopodSettings(update);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/settings/sumopod POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
