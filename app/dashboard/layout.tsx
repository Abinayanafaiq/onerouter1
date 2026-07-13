import { auth, signOut } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { getOrCreateWallet } from "@/app/lib/wallet";
import { idrToToks } from "@/app/lib/constants";
import { getTelegramGroupUrl } from "@/app/lib/telegram";
import { DashboardShell } from "@/app/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  const [wallet, telegramGroupUrl] = await Promise.all([
    userId ? getOrCreateWallet(userId) : null,
    getTelegramGroupUrl(),
  ]);
  const balanceToks = idrToToks(Number(wallet?.balance ?? 0));
  const userName = session.user.name || session.user.email || "Developer";
  const userEmail = session.user.email || "";

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
      {children}
    </DashboardShell>
  );
}
