import Link from "next/link";
import { auth, signOut } from "@/app/lib/auth";
import { APP_NAME } from "@/app/lib/constants";

export async function SiteHeader() {
  const session = await auth();
  const isAuthed = !!session?.user;

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/5 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-bold text-lg flex items-center gap-2">
          <span className="bg-white text-black px-2 py-0.5 rounded text-xs font-mono font-bold">
            1R
          </span>
          <span className="gradient-text">{APP_NAME}</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/#models" className="text-muted-foreground hover:text-foreground transition hidden sm:inline">
            Models
          </Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition">
            Pricing
          </Link>
          {isAuthed ? (
            <>
              <Link
                href="/dashboard/wallet"
                className="text-muted-foreground hover:text-foreground transition"
              >
                Wallet
              </Link>
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition hidden sm:inline"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/wallet"
                className="bg-white text-black px-3 py-1.5 rounded-md text-xs font-medium hover:bg-foreground/90 transition shadow-lg shadow-white/10"
              >
                Top Up Credits
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-foreground transition text-xs"
                >
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition">
                Masuk
              </Link>
              <Link
                href="/register"
                className="bg-white text-black px-3 py-1.5 rounded-md text-xs font-medium hover:bg-foreground/90 transition shadow-lg shadow-white/10"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
