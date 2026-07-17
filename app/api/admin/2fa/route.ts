import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getAdmin2FASettings,
  setAdmin2FASettings,
  clearAdmin2FASettings,
} from "@/app/lib/admin-2fa";
import { writeAuditLog } from "@/app/lib/audit-log";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/2fa
 * Returns the current 2FA configuration. The question text is returned in
 * full (it is shown at login time anyway, so it is not secret). The answer
 * hash is NEVER returned — only a boolean `answerSet`.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const settings = await getAdmin2FASettings();
    return NextResponse.json({
      success: true,
      enabled: settings.enabled,
      question: settings.question,
      answerSet: !!settings.answerHash,
    });
  } catch (e) {
    console.error("[admin/2fa GET] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/2fa
 * Set (or replace) the security question + answer. The answer plaintext is
 * hashed server-side immediately and never persisted or logged.
 *
 * Enforces a minimum answer length of 2 characters. A 1-char answer would
 * have only ~26 possible values (after lowercasing), making brute-force
 * trivial even with rate-limiting. 2 chars = ~676 combinations × 5/10min
 * rate-limit = ~2.7 hours to brute-force; longer is better but we don't
 * enforce a high minimum to avoid locking out the admin who picked a short
 * but personal answer (e.g. "Li" for a mother's name).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const actorId = (session.user as { id?: string }).id ?? null;

    const body = (await request.json()) as {
      question?: string;
      answer?: string;
    };

    const question = (body.question || "").trim();
    const answer = (body.answer || "").trim();

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Pertanyaan wajib diisi" },
        { status: 400 },
      );
    }
    if (question.length > 200) {
      return NextResponse.json(
        { success: false, error: "Pertanyaan terlalu panjang (maks 200 karakter)" },
        { status: 400 },
      );
    }
    if (answer.length < 2) {
      return NextResponse.json(
        { success: false, error: "Jawaban minimal 2 karakter" },
        { status: 400 },
      );
    }
    if (answer.length > 200) {
      return NextResponse.json(
        { success: false, error: "Jawaban terlalu panjang (maks 200 karakter)" },
        { status: 400 },
      );
    }

    await setAdmin2FASettings({ question, answer });

    await writeAuditLog({
      actorUserId: actorId,
      action: "admin_2fa.set",
      target: "self",
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/2fa POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/2fa
 * Disable 2FA by clearing the stored question + answer hash. The admin must
 * be already authenticated (this route is admin-gated), so this is a
 * legitimate "I forgot my answer and want to reconfigure" path. Audit-logged
 * so a silent disable is visible in the audit trail.
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const actorId = (session.user as { id?: string }).id ?? null;

    await clearAdmin2FASettings();

    await writeAuditLog({
      actorUserId: actorId,
      action: "admin_2fa.disable",
      target: "self",
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/2fa DELETE] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
