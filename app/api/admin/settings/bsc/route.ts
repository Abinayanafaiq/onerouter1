import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getBscSettings, saveBscSettings } from "@/app/lib/crypto-bsc";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const settings = await getBscSettings();
    return NextResponse.json({
      success: true,
      walletAddress: settings.walletAddress,
      rpcUrl: settings.rpcUrl,
      confirmations: settings.confirmations,
      isConfigured: !!settings.walletAddress,
    });
  } catch (e) {
    console.error("[admin/settings/bsc GET] exception:", e);
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
      walletAddress?: string;
      rpcUrl?: string;
      confirmations?: number;
    };

    const update: { walletAddress?: string; rpcUrl?: string; confirmations?: number } = {};

    if (body.walletAddress !== undefined) {
      const v = body.walletAddress.trim();
      if (v && !/^0x[a-fA-F0-9]{40}$/.test(v)) {
        return NextResponse.json({ success: false, error: "Address tidak valid (harus 0x... 40 hex)" }, { status: 400 });
      }
      update.walletAddress = v;
    }

    if (body.rpcUrl !== undefined) {
      const v = body.rpcUrl.trim();
      if (v && !v.startsWith("http")) {
        return NextResponse.json({ success: false, error: "RPC URL tidak valid" }, { status: 400 });
      }
      update.rpcUrl = v;
    }

    if (body.confirmations !== undefined) {
      const v = Number(body.confirmations);
      if (!Number.isFinite(v) || v < 1 || v > 100) {
        return NextResponse.json({ success: false, error: "Konfirmasi 1-100" }, { status: 400 });
      }
      update.confirmations = Math.floor(v);
    }

    await saveBscSettings(update);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/settings/bsc POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
