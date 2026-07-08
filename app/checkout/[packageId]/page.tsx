import { auth } from "@/app/lib/auth";
import { findPackage } from "@/app/lib/packages";
import { CRYPTO_CHAINS, isBtcpayConfigured } from "@/app/lib/btcpay";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";
import { CheckoutForm } from "./form";
import Link from "next/link";

async function getQrisImage(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: "qris_image" },
  });
  return setting?.value ?? null;
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/checkout");

  const { packageId } = await params;
  const pkg = await findPackage(packageId);
  if (!pkg) redirect("/pricing");

  const qrisImage = await getQrisImage();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold text-lg">OneRouter</Link>
          <span className="text-sm text-muted-foreground">{session.user.email}</span>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-12 max-w-lg">
        <h1 className="text-2xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Paket <span className="font-medium text-foreground">{pkg.name}</span> —
          Rp{pkg.price.toLocaleString("id-ID")} &middot; {pkg.tokenQuota ? (Number(pkg.tokenQuota) / 1_000_000).toFixed(0) : "?"} Jt token &middot; {pkg.durationDays} hari
        </p>

        <CheckoutForm
          packageId={packageId}
          amount={pkg.price}
          chains={[...CRYPTO_CHAINS]}
          btcpayConfigured={isBtcpayConfigured()}
          qrisImage={qrisImage}
        />
      </main>
    </div>
  );
}
