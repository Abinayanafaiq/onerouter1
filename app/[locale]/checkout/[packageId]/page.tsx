import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { findPackage, PACKAGE_CRYPTO_ENABLED } from "@/app/lib/packages";
import { CRYPTO_CHAINS, isBtcpayConfigured } from "@/app/lib/btcpay";
import { isSumopodConfigured } from "@/app/lib/sumopod";
import { isBscConfigured } from "@/app/lib/crypto-bsc";
import { redirect, Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckoutForm } from "./form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ packageId: string; locale: string }>;
  searchParams: Promise<{ renew?: string }>;
}) {
  const session = await auth();
  const locale = await getLocale();
  const tt = await getTranslations("Terms");
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { packageId } = await params;
  const { renew } = await searchParams;
  const renewKeyId = renew?.trim() || null;

  const pkg = await findPackage(packageId);
  if (!pkg) {
    redirect({ href: "/pricing", locale });
    return null;
  }

  const userId = (session.user as { id?: string }).id;

  // Mode renew: ?renew=<apiKeyId> — perpanjang key paket yang sama.
  // Key harus milik user, bertipe TOKEN_PACKAGE, dan berasal dari paket ini.
  let renewalKey: {
    id: string;
    prefix: string | null;
    last4: string | null;
    expiresAt: Date | null;
    tokenQuota: bigint;
    tokenUsed: bigint;
  } | null = null;
  if (renewKeyId && userId) {
    const key = await prisma.apiKey.findUnique({
      where: { id: renewKeyId },
      select: {
        id: true,
        userId: true,
        billingMode: true,
        prefix: true,
        last4: true,
        expiresAt: true,
        tokenQuota: true,
        tokenUsed: true,
      },
    });
    if (key && key.userId === userId && key.billingMode === "TOKEN_PACKAGE") {
      const source = await prisma.order.findFirst({
        where: { apiKeyId: key.id },
        orderBy: { createdAt: "asc" },
        select: { packageId: true },
      });
      if (source && source.packageId === packageId) {
        renewalKey = key;
      }
    }
    if (!renewalKey) {
      // Target renew tidak valid — kembalikan ke daftar paket user.
      redirect({ href: "/dashboard/packages", locale });
      return null;
    }
  }

  const [sumopodConfigured, bscConfigured] = await Promise.all([
    isSumopodConfigured(),
    isBscConfigured(),
  ]);

  const tokenJt = pkg.tokenQuota ? (Number(pkg.tokenQuota) / 1_000_000).toFixed(0) : "?";

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Ambient background */}
      <div className="grid-bg pointer-events-none absolute inset-0 -z-10 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
        style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(184,255,69,0.08), transparent 70%)" }}
        aria-hidden
      />

      <header className="border-b border-white/[0.06]">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="gradient-text font-bold text-lg tracking-tight">9inference</Link>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            {session.user.email}
          </span>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-lg">
        {/* Back link */}
        <Link
          href={renewalKey ? "/dashboard/packages" : "/pricing"}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {renewalKey ? "Kembali ke Paket Saya" : "Kembali ke Paket"}
        </Link>

        <h1 className="gradient-text mt-4 text-3xl font-bold tracking-tight">
          {renewalKey ? "Perpanjang Paket" : "Checkout"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {renewalKey
            ? "Selesaikan pembayaran untuk memperpanjang paket Anda."
            : "Selesaikan pembayaran untuk mengaktifkan paket Anda."}
        </p>

        {/* Order summary card */}
        <div className="glass relative mt-6 overflow-hidden rounded-2xl p-5">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(184,255,69,0.10), transparent 70%)" }}
            aria-hidden
          />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">Paket</div>
              <div className="mt-1 text-lg font-bold tracking-tight">{pkg.name}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">Total</div>
              <div className="gradient-text-accent mt-0.5 text-2xl font-bold tracking-tight">
                Rp{pkg.price.toLocaleString("id-ID")}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3">
              <div className="text-[11px] text-muted-foreground">Kuota Token</div>
              <div className="mt-0.5 text-base font-bold">{tokenJt} Jt</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3">
              <div className="text-[11px] text-muted-foreground">Masa Aktif</div>
              <div className="mt-0.5 text-base font-bold">{pkg.durationDays} Hari</div>
            </div>
          </div>

          {(pkg.allowedModels?.length ?? 0) > 0 && (
            <div className="mt-3.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-2.5">
              <p className="text-xs leading-relaxed text-amber-300">
                Paket khusus: hanya dapat digunakan untuk model{" "}
                <code className="font-mono font-semibold">{pkg.allowedModels.join(", ")}</code>.
                Model lain akan ditolak.
              </p>
            </div>
          )}

          {renewalKey && (
            <div className="mt-3.5 space-y-2.5">
              <div className="rounded-xl border border-accent/25 bg-accent/[0.07] px-3.5 py-2.5">
                <p className="text-xs leading-relaxed text-foreground">
                  Perpanjangan paket — <span className="font-semibold text-accent">API key Anda tidak berubah</span>{" "}
                  (<code className="font-mono">{renewalKey.prefix || "sk_live_"}••••••{renewalKey.last4 || "••••"}</code>),
                  jadi tidak perlu mengubah konfigurasi di aplikasi Anda.
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Masa aktif sekarang:{" "}
                  {renewalKey.expiresAt
                    ? renewalKey.expiresAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
                    : "tanpa batas"}
                  {" "}→ ditambah {pkg.durationDays} hari
                  {renewalKey.expiresAt && renewalKey.expiresAt > new Date()
                    ? " dari tanggal berakhir tersebut"
                    : " mulai sekarang"}
                  .
                </p>
              </div>
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3.5 py-2.5">
                <p className="text-xs leading-relaxed text-amber-300">
                  Perhatian: sisa kuota saat ini (
                  <span className="font-semibold">
                    {Number(
                      renewalKey.tokenQuota > renewalKey.tokenUsed
                        ? renewalKey.tokenQuota - renewalKey.tokenUsed
                        : 0n,
                    ).toLocaleString("id-ID")} token
                  </span>
                  ) akan <span className="font-semibold">hangus</span> — kuota dimulai ulang
                  dari penuh sesuai paket, tidak ditumpuk.
                </p>
              </div>
            </div>
          )}

          <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-accent/15 bg-accent/[0.05] px-3.5 py-2.5">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-accent">
              <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H13L13 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-xs text-muted-foreground">
              {renewalKey
                ? "Kuota kembali penuh & masa aktif diperpanjang otomatis setelah pembayaran terkonfirmasi."
                : "API key & kuota otomatis aktif setelah pembayaran terkonfirmasi."}
            </p>
          </div>
        </div>

        {/* Payment method */}
        <div className="mt-6">
          <CheckoutForm
            packageId={packageId}
            amount={pkg.price}
            chains={[...CRYPTO_CHAINS]}
            btcpayConfigured={PACKAGE_CRYPTO_ENABLED && isBtcpayConfigured()}
            sumopodConfigured={sumopodConfigured}
            bscConfigured={PACKAGE_CRYPTO_ENABLED && bscConfigured}
            renewApiKeyId={renewalKey?.id ?? null}
          />
          <p className="mt-4 text-center text-[12px] text-muted-foreground">
            {tt.rich("agreePurchase", {
              link: (chunks) => (
                <Link href="/terms" className="text-foreground underline underline-offset-2 hover:text-accent">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </main>
    </div>
  );
}
import type { Metadata } from "next";
