import type { Metadata } from "next";
import { auth, signOut } from "@/app/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getWalletBalance } from "@/app/lib/wallet";
import { idrToToks } from "@/app/lib/constants";
import { getTelegramGroupUrl } from "@/app/lib/telegram";
import { getAllPackages } from "@/app/lib/packages";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { PakasirPendingVerifier } from "@/app/components/pending-verifier";
import { CompatNoticePopup } from "@/app/components/compat-notice-popup";
import { BuyPackagePromoPopup } from "@/app/components/buy-package-promo-popup";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
    return null;
  }
  const user = session.user;

  const userId = (user as { id?: string }).id;
  // Layout only needs to READ the balance — don't upsert here. Upsert holds a
  // transaction + 2 round-trips and exhausts the tiny connection_limit=2 pool
  // when CreditBadge fires /api/wallet/summary at the same time. Wallet rows
  // are created lazily by getOrCreateWallet only on the first write (top-up /
  // usage), so reading 0 here is fine and avoids the pool timeout.
  const [balance, telegramGroupUrl, tokenPackages] = await Promise.all([
    userId ? getWalletBalance(userId) : Promise.resolve(0),
    getTelegramGroupUrl(),
    // Single short-lived findMany (read-only) for the promo popup — safe for
    // the tiny connection pool, unlike an upsert transaction.
    getAllPackages(),
  ]);
  const balanceToks = idrToToks(balance);

  // Paket "paling hemat" untuk popup promo: paket highlight dari admin, atau
  // token per rupiah tertinggi. Dikonversi ke plain number agar bisa dikirim
  // ke client component (bigint tidak serializable).
  const promoPackage = (() => {
    if (tokenPackages.length === 0) return null;
    const best =
      tokenPackages.find((p) => p.highlight) ??
      tokenPackages.reduce((a, b) =>
        Number(a.tokenQuota) / a.price >= Number(b.tokenQuota) / b.price ? a : b,
      );
    return {
      id: best.id,
      name: best.name,
      price: best.price,
      quotaTokens: Number(best.tokenQuota),
    };
  })();
  const userName = user.name || user.email || "Developer";
  const userEmail = user.email || "";

  return (
    <DashboardShell
      userEmail={userEmail}
      userName={userName}
      initialToks={balanceToks}
      telegramGroupUrl={telegramGroupUrl || null}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <PakasirPendingVerifier />
      <CompatNoticePopup />
      <BuyPackagePromoPopup bestPackage={promoPackage} />
      {children}
    </DashboardShell>
  );
}
