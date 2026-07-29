import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { regenerateApiKey, getOwnedKeyBillingMode } from "@/app/lib/api-keys";
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

    // Token-package keys were already paid for via their order — rotating the
    // secret preserves quota & expiry and mints no new value, so the PAYG
    // balance gate below must not block package owners.
    const billingMode = await getOwnedKeyBillingMode(userId, id);
    if (billingMode === null) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (billingMode !== "TOKEN_PACKAGE") {
      // Security: rotating a key mints new key material, so apply the same
      // balance > 0 gate as key creation. Read-only check — never mutates the
      // wallet.
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
