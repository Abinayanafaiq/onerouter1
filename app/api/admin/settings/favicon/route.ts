import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { InvalidImageError, normalizeUploadedImage } from "@/app/lib/image-upload";
import { prisma } from "@/app/lib/prisma";

const FAVICON_KEY = "site_favicon";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", status: 401 };
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 };
  return null;
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) {
      return NextResponse.json({ success: false, error: authError.error }, { status: authError.status });
    }

    const formData = await request.formData();
    const file = formData.get("favicon");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "File favicon diperlukan" },
        { status: 400 },
      );
    }

    const value = await normalizeUploadedImage(file, 512);
    await prisma.setting.upsert({
      where: { key: FAVICON_KEY },
      update: { value },
      create: { key: FAVICON_KEY, value },
    });

    return NextResponse.json({ success: true, value });
  } catch (error) {
    if (error instanceof InvalidImageError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("[admin/settings/favicon POST] exception:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const authError = await requireAdmin();
    if (authError) {
      return NextResponse.json({ success: false, error: authError.error }, { status: authError.status });
    }

    await prisma.setting.deleteMany({ where: { key: FAVICON_KEY } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/settings/favicon DELETE] exception:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
