import type { Metadata } from "next";
import { auth, signOut } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user?.role !== "ADMIN") redirect("/dashboard");

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/orders", label: "Pesanan" },
    { href: "/admin/wallets", label: "Dompet" },
    { href: "/admin/models", label: "Model" },
    { href: "/admin/api-keys", label: "API Key" },
    { href: "/admin/master-keys", label: "Master Key" },
    { href: "/admin/analytics", label: "Analitik" },
    { href: "/admin/packages", label: "Paket" },
    { href: "/admin/settings", label: "Pengaturan" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold flex items-center gap-2">
              <span className="bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded text-[10px] font-mono">
                ADM
              </span>
              <span className="hidden sm:inline">OneRouter</span>
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2.5 py-1 rounded-md text-xs hover:bg-neutral-800 transition text-neutral-300"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              User View →
            </Link>
            <span className="text-xs text-neutral-500 hidden sm:inline">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="border border-neutral-700 px-2.5 py-1 rounded text-xs hover:bg-neutral-800 transition"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">{children}</main>
    </div>
  );
}