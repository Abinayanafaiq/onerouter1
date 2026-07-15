import { auth } from "@/app/lib/auth";
import { findPackage } from "@/app/lib/packages";
import { CRYPTO_CHAINS, isBtcpayConfigured } from "@/app/lib/btcpay";
import { isPakasirConfigured } from "@/app/lib/pakasir";
import { isBscConfigured } from "@/app/lib/crypto-bsc";
import { redirect, Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { CheckoutForm } from "./form";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ packageId: string; locale: string }>;
}) {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { packageId } = await params;
  const pkg = await findPackage(packageId);
  if (!pkg) {
    redirect({ href: "/pricing", locale });
    return null;
  }

  const [pakasirConfigured, bscConfigured] = await Promise.all([
    isPakasirConfigured(),
    isBscConfigured(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold text-lg">9inference</Link>
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
          pakasirConfigured={pakasirConfigured}
          bscConfigured={bscConfigured}
        />
      </main>
    </div>
  );
}
