import { auth, signOut } from "@/app/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold flex items-center gap-2">
            <span className="bg-foreground text-background px-1.5 py-0.5 rounded text-[10px] font-mono">1R</span>
            OneRouter
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-xs hover:underline">Harga</Link>
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