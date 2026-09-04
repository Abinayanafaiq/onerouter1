import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getBlockedEmailDomains,
  saveBlockedEmailDomains,
  normalizeDomainInput,
  isValidDomain,
} from "@/app/lib/email-blacklist";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const domains = await getBlockedEmailDomains();
    return NextResponse.json({ success: true, domains });
  } catch (e) {
    console.error("[admin/settings/email-blacklist GET] exception:", e);
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
      action?: "add" | "remove";
      domain?: string;
    };

    const domain = normalizeDomainInput(body.domain || "");
    if (!domain || !isValidDomain(domain)) {
      return NextResponse.json(
        { success: false, error: "Format domain tidak valid (contoh: spammer.com)" },
        { status: 400 },
      );
    }

    const current = await getBlockedEmailDomains();

    if (body.action === "add") {
      if (current.includes(domain)) {
        return NextResponse.json({ success: true, domains: current, alreadyExists: true });
      }
      const next = [...current, domain];
      await saveBlockedEmailDomains(next);
      return NextResponse.json({ success: true, domains: next.sort() });
    }

    if (body.action === "remove") {
      const next = current.filter((d) => d !== domain);
      await saveBlockedEmailDomains(next);
      return NextResponse.json({ success: true, domains: next });
    }

    return NextResponse.json(
      { success: false, error: "Action harus 'add' atau 'remove'" },
      { status: 400 },
    );
  } catch (e) {
    console.error("[admin/settings/email-blacklist POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
