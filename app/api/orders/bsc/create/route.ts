import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";
import { isBscConfigured, generateUniqueUsdtAmount, getBscSettings } from "@/app/lib/crypto-bsc";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Harap login" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = (await request.json()) as { packageId: string };
    const { packageId } = body;

    const pkg = await findPackage(packageId);
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan" }, { status: 400 });
    }

    if (pkg.stock <= 0) {
      return NextResponse.json({ success: false, error: "Paket habis terjual" }, { status: 400 });
    }

    if (!(await isBscConfigured())) {
      return NextResponse.json(
        { success: false, error: "Pembayaran crypto belum dikonfigurasi." },
        { status: 503 },
      );
    }

    const amountResult = await generateUniqueUsdtAmount(pkg.price);
    if (!amountResult.ok) {
      return NextResponse.json({ success: false, error: amountResult.error }, { status: 400 });
    }

    const { walletAddress } = await getBscSettings();

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          packageId,
          amount: pkg.price,
          paymentMethod: "CRYPTO_BSC",
          cryptoChain: "USDT-BEP20",
          cryptoAmount: amountResult.usdtAmount,
          cryptoExpectedAmount: amountResult.usdtAmount,
          status: "PENDING",
        },
      });
      await tx.package.update({
        where: { id: packageId },
        data: { stock: { decrement: 1 } },
      });
      return created;
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      payAmount: amountResult.usdtAmount,
      payCurrency: "USDT",
      chain: "BEP20 (BSC)",
      walletAddress,
    });
  } catch (e) {
    console.error("[bsc/create] exception:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
