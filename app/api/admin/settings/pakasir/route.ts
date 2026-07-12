import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getPakasirSettings, savePakasirSettings } from "@/app/lib/pakasir";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const settings = await getPakasirSettings();
    const maskedApiKey = settings.apiKey
      ? `${settings.apiKey.slice(0, 4)}${"*".repeat(Math.max(0, settings.apiKey.length - 8))}${settings.apiKey.slice(-4)}`
      : "";
    return NextResponse.json({
      success: true,
      slug: settings.slug,
      apiKeyMasked: maskedApiKey,
      apiKeySet: !!settings.apiKey,
      webhookSecretSet: !!settings.webhookSecret,
    });
  } catch (e) {
    console.error("[admin/settings/pakasir GET] exception:", e);
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
      slug?: string;
      apiKey?: string;
      webhookSecret?: string;
      clearWebhookSecret?: boolean;
    };

    const update: { slug?: string; apiKey?: string; webhookSecret?: string } = {};

    if (body.slug !== undefined) {
      const slug = body.slug.trim();
      if (!slug) {
        return NextResponse.json({ success: false, error: "Slug tidak boleh kosong" }, { status: 400 });
      }
      update.slug = slug;
    }

    if (body.apiKey !== undefined && body.apiKey.trim() !== "") {
      update.apiKey = body.apiKey.trim();
    }

    if (body.clearWebhookSecret) {
      update.webhookSecret = "";
    } else if (body.webhookSecret !== undefined && body.webhookSecret.trim() !== "") {
      update.webhookSecret = body.webhookSecret.trim();
    }

    await savePakasirSettings(update);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/settings/pakasir POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
