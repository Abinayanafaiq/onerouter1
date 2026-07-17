import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const PACKAGE_BASE_URL = "https://9inference.cloud/v1/package";

function formatNumber(value: bigint | number): string {
  return Number(value).toLocaleString("id-ID");
}

function formatDate(value: Date | null): string {
  if (!value) return "Tidak dibatasi";
  return value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function remainingTime(expiresAt: Date | null, now: Date): string {
  if (!expiresAt) return "Tidak kedaluwarsa";
  const milliseconds = expiresAt.getTime() - now.getTime();
  if (milliseconds <= 0) return "Masa aktif telah berakhir";
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  return hours > 0 ? `${hours} jam ${minutes} menit tersisa` : `${Math.max(1, minutes)} menit tersisa`;
}

function keyStatus(key: {
  enabled: boolean;
  isActive: boolean;
  expiresAt: Date | null;
  tokenUsed: bigint;
  tokenQuota: bigint;
}, now: Date) {
  if (!key.enabled || !key.isActive) return { label: "Dinonaktifkan", cls: "border-white/10 bg-white/[0.04] text-muted-foreground" };
  if (key.expiresAt && key.expiresAt <= now) return { label: "Kedaluwarsa", cls: "border-red-400/20 bg-red-400/10 text-red-300" };
  if (key.tokenUsed >= key.tokenQuota) return { label: "Kuota habis", cls: "border-amber-400/20 bg-amber-400/10 text-amber-300" };
  return { label: "Aktif", cls: "border-accent/20 bg-accent/10 text-accent" };
}

function orderStatus(status: string) {
  const styles: Record<string, { label: string; cls: string }> = {
    APPROVED: { label: "Berhasil", cls: "bg-emerald-400/10 text-emerald-300" },
    PENDING: { label: "Menunggu pembayaran", cls: "bg-amber-400/10 text-amber-300" },
    REJECTED: { label: "Ditolak", cls: "bg-red-400/10 text-red-300" },
    CANCELLED: { label: "Dibatalkan", cls: "bg-white/[0.05] text-muted-foreground" },
  };
  return styles[status] ?? { label: status, cls: "bg-white/[0.05] text-muted-foreground" };
}

export default async function PackagesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const [keys, orders] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId, billingMode: "TOKEN_PACKAGE" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: {
        userId,
        OR: [
          { productTypeSnapshot: "TOKEN_PACKAGE" },
          { package: { productType: "TOKEN_PACKAGE" } },
        ],
      },
      include: { package: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const now = new Date();
  const activeKeys = keys.filter((key) =>
    key.enabled && key.isActive && (!key.expiresAt || key.expiresAt > now) && key.tokenUsed < key.tokenQuota,
  );
  const totalRemaining = activeKeys.reduce((sum, key) => sum + (key.tokenQuota - key.tokenUsed), 0n);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-transparent px-5 py-6 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/[0.08] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              <span className="h-px w-5 bg-accent/60" /> Paket token
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Paket Saya</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Pantau kuota, masa aktif, API key paket, dan riwayat pembelian dalam satu tempat.
            </p>
          </div>
          <Link href="/pricing" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110">
            Beli Paket Baru
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Paket aktif" value={activeKeys.length.toLocaleString("id-ID")} detail="API key siap digunakan" accent />
        <SummaryCard label="Total sisa token" value={formatNumber(totalRemaining)} detail="Dari seluruh paket aktif" />
        <SummaryCard label="Total pembelian" value={orders.length.toLocaleString("id-ID")} detail="Termasuk order tertunda" />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">API key paket</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Setiap pembelian memiliki kuota dan masa aktif sendiri.</p>
        </div>

        {keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-accent">
              <PackageIcon />
            </div>
            <h3 className="mt-4 text-sm font-semibold">Belum ada paket token</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">Beli paket untuk mendapatkan API key khusus dengan kuota token tetap selama 24 jam.</p>
            <Link href="/pricing" className="mt-5 inline-flex rounded-lg border border-accent/20 bg-accent/[0.08] px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/[0.12]">Lihat Paket</Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {keys.map((key) => {
              const remaining = key.tokenQuota > key.tokenUsed ? key.tokenQuota - key.tokenUsed : 0n;
              const usedPercentage = key.tokenQuota > 0n
                ? Math.min(100, (Number(key.tokenUsed) / Number(key.tokenQuota)) * 100)
                : 100;
              const status = keyStatus(key, now);

              return (
                <article key={key.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] p-5">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{key.name || key.label || "Paket Token"}</h3>
                      <code className="mt-1 block text-[11px] text-muted-foreground">{key.prefix || "sk_live_"}••••••{key.last4 || "••••"}</code>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${status.cls}`}>{status.label}</span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Sisa kuota</div>
                        <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{formatNumber(remaining)}</div>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">dari {formatNumber(key.tokenQuota)} token</div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all" style={{ width: `${100 - usedPercentage}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                      <span>{usedPercentage.toFixed(1)}% terpakai</span>
                      <span>{remainingTime(key.expiresAt, now)}</span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 text-[11px]">
                      <Info label="Aktif sampai" value={formatDate(key.expiresAt)} />
                      <Info label="Token terpakai" value={formatNumber(key.tokenUsed)} mono />
                      <Info label="Total request" value={key.requestCount.toLocaleString("id-ID")} mono />
                      <Info label="Terakhir digunakan" value={key.lastUsedAt ? formatDate(key.lastUsedAt) : "Belum pernah"} />
                    </dl>

                    <div className="mt-4 rounded-lg border border-white/[0.07] bg-black/20 p-3">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Base URL paket</div>
                      <code className="mt-1.5 block break-all text-[11px] text-accent">{PACKAGE_BASE_URL}</code>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Riwayat pembelian</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Status 20 order paket terbaru.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.015]">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-white/[0.07] bg-white/[0.025]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Paket</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Tanggal</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground">Kuota</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground">Harga</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Pembayaran</th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {orders.map((order) => {
                const status = orderStatus(order.status);
                return (
                  <tr key={order.id} className="transition hover:bg-white/[0.025]">
                    <td className="px-4 py-3 font-medium">{order.package.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatNumber(order.tokenQuotaSnapshot ?? order.package.tokenQuota)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">Rp{order.amount.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.paymentMethod.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-center"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${status.cls}`}>{status.label}</span></td>
                  </tr>
                );
              })}
              {orders.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">Belum ada riwayat pembelian paket.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-accent/20 bg-accent/[0.05]" : "border-white/[0.08] bg-white/[0.02]"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</div>
      <div className={`mt-3 text-2xl font-semibold tracking-tight ${accent ? "text-accent" : ""}`}>{value}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className={`mt-1 truncate text-foreground/90 ${mono ? "font-mono" : ""}`} title={value}>{value}</dd></div>;
}

function PackageIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9ZM4 7.5l8 4.5 8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}
