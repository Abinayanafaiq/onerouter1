import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { InvalidImageError, normalizeUploadedImage } from "@/app/lib/image-upload";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const setting = await prisma.setting.findUnique({
      where: { key: "qris_image" },
    });
    return NextResponse.json({ success: true, value: setting?.value ?? null });
  } catch (e) {
    console.error("[admin/settings/qris GET] exception:", e);
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

    const formData = await request.formData();
    const file = formData.get("qris") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "File QRIS diperlukan" }, { status: 400 });
    }

    const base64 = await normalizeUploadedImage(file);

    await prisma.setting.upsert({
      where: { key: "qris_image" },
      update: { value: base64 },
      create: { key: "qris_image", value: base64 },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof InvalidImageError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
    console.error("[admin/settings/qris POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.setting.deleteMany({ where: { key: "qris_image" } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/settings/qris DELETE] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
