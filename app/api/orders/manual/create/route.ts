import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage } from "@/app/lib/packages";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get("packageId");

    if (!packageId) redirect("/pricing");

    const pkg = await findPackage(packageId);
    if (!pkg) redirect("/pricing");

    if (pkg.stock <= 0) redirect("/pricing?error=habis");

    await prisma.order.create({
      data: {
        userId,
        packageId,
        amount: pkg.price,
        paymentMethod: "MANUAL",
        status: "PENDING",
      },
    });

    await prisma.package.update({
      where: { id: packageId },
      data: { stock: { decrement: 1 } },
    });

    redirect("/dashboard");
  } catch (e) {
    console.error("[manual/create] exception:", e);
    redirect("/dashboard");
  }
}