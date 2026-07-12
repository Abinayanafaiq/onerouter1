import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { adminAdjustBalance } from "@/app/lib/wallet";

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
      userId: string;
      amount: number;
      description: string;
    };

    if (!body.userId) {
      return NextResponse.json({ success: false, error: "UserId diperlukan" }, { status: 400 });
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ success: false, error: "Amount tidak valid" }, { status: 400 });
    }

    const result = await adminAdjustBalance({
      userId: body.userId,
      amount,
      description: body.description || `Admin ${amount > 0 ? "add" : "deduct"}`,
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, newBalance: result.newBalance });
  } catch (e) {
    console.error("[admin/wallets/adjust] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
