import { auth, signOut } from "@/app/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateWallet } from "@/app/lib/wallet";
import { idrToToks } from "@/app/lib/constants";
import { CreditBadge } from "@/app/components/credit-badge";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  const wallet = userId ? await getOrCreateWallet(userId) : null;
  const balanceToks = idrToToks(Number(wallet?.balance ?? 0));

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold flex items-center gap-2">
            <span className="bg-white text-black px-1.5 py-0.5 rounded text-[10px] font-mono">1R</span>
            OneRouter
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs hover:underline hidden sm:inline">Dashboard</Link>
            <Link href="/dashboard/api-keys" className="text-xs hover:underline">API Keys</Link>
            <Link href="/dashboard/usage" className="text-xs hover:underline">Usage</Link>
            <Link href="/dashboard/wallet" className="text-xs hover:underline">Wallet</Link>
            <Link href="/dashboard/chat" className="text-xs hover:underline">Chat</Link>
            <CreditBadge initialToks={balanceToks} />
            <span className="text-xs text-muted-foreground hidden sm:inline">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="border px-2.5 py-1 rounded text-xs hover:bg-muted transition"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}