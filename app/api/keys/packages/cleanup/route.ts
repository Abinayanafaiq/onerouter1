import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { deleteInactivePackageKeys } from "@/app/lib/api-keys";

export const dynamic = "force-dynamic";

/**
 * Hapus (soft delete) semua paket token milik user yang sudah tidak bisa
 * dipakai: kedaluwarsa, kuota habis, atau dinonaktifkan.
 */
export async function POST() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const deleted = await deleteInactivePackageKeys(userId);
    return NextResponse.json({ success: true, deleted });
  } catch (e) {
    console.error("[keys/packages/cleanup POST] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
