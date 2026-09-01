import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

/**
 * Housekeeping order Sumopod PENDING milik user yang sedang login.
 *
 * API Sumopod tidak punya endpoint cek status, jadi route ini tidak bisa
 * memverifikasi pembayaran secara server-side — approval sepenuhnya lewat
 * webhook. Yang bisa dilakukan lokal: membatalkan order PENDING yang payment
 * link-nya sudah lewat masa berlaku (sumopodExpiredAt), supaya UI tidak
 * menampilkan invoice menggantung.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Harap login" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const now = new Date();
    const r = await prisma.order.updateMany({
      where: {
        userId,
        paymentMethod: "SUMOPOD",
        status: "PENDING",
        sumopodExpiredAt: { lt: now },
      },
      data: { status: "CANCELLED", adminNote: "Payment link Sumopod expired" },
    });

    return NextResponse.json({
      success: true,
      approved: 0,
      cancelled: r.count,
    });
  } catch (e) {
    console.error("[sumopod/verify-pending] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
