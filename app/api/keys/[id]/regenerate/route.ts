import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { regenerateApiKey } from "@/app/lib/api-keys";

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
