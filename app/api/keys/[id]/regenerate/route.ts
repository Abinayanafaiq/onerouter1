import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { regenerateApiKey, getOwnedKeyGuard } from "@/app/lib/api-keys";
import { getWalletBalance } from "@/app/lib/wallet";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const guard = await getOwnedKeyGuard(userId, id);
    if (!guard) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (guard.billingMode === "PAYG") {
      // Security: rotating a PAYG key mints new key material, so apply the
      // same balance > 0 gate as key creation. Read-only check — never
      // mutates the wallet. Paid package keys (TOKEN_PACKAGE & LEGACY) were
      // already paid for via their order — rotating the secret preserves
      // quota & expiry and mints no new value, so they skip this gate.
      const balance = await getWalletBalance(userId);
      if (balance <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Isi saldo terlebih dahulu untuk regenerate API key.",
            code: "insufficient_balance",
          },
          { status: 402 },
        );
      }
    } else if (guard.expiresAt && guard.expiresAt <= new Date()) {
      // Package key whose active window has ended. Regenerating is allowed
      // technically but produces a key that instantly fails auth (expired is
      // checked at request time) — a confusing "baru digenerate tapi
      // unauthorized" experience. Reject up-front with a clear explanation.
      return NextResponse.json(
        {
          success: false,
          error:
            "Paket sudah kedaluwarsa. Regenerate tidak memperpanjang masa aktif — beli paket baru untuk mendapatkan key baru.",
          code: "package_expired",
        },
        { status: 400 },
      );
    }

    const result = await regenerateApiKey(userId, id);
    if (!result) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      key: result.view,
      plaintext: result.plaintext,
    });
  } catch (e) {
    console.error("[keys/[id]/regenerate] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
