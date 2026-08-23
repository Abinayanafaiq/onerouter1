import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getEnabledPackageModels } from "@/app/lib/package-models";
import { CopyChip } from "@/app/components/copy-chip";
import { RevealKey } from "../reveal-key";
import { RegeneratePackageKey } from "./regenerate-package-key";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

const PACKAGE_BASE_URL = "https://9inference.cloud/v1/package";

type TFunc = (key: string, values?: Record<string, string | number>) => string;

function formatNumber(value: bigint | number, locale: string): string {
  return Number(value).toLocaleString(locale);
}

function formatDate(value: Date | null, locale: string, t: TFunc): string {
  if (!value) return t("notLimited");
  return value.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function remainingTime(expiresAt: Date | null, now: Date, t: TFunc): string {
  if (!expiresAt) return t("noExpiry");
  const milliseconds = expiresAt.getTime() - now.getTime();
  if (milliseconds <= 0) return t("expired");
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  return hours > 0
    ? t("remainingHoursMinutes", { hours, minutes })
    : t("remainingMinutes", { minutes: Math.max(1, minutes) });
}

function keyStatus(key: {
  enabled: boolean;
  isActive: boolean;
  expiresAt: Date | null;
  tokenUsed: bigint;
  tokenQuota: bigint;
}, now: Date, t: TFunc) {
  if (!key.enabled || !key.isActive) return { label: t("statusDisabled"), cls: "border-white/10 bg-white/[0.04] text-muted-foreground" };
  if (key.expiresAt && key.expiresAt <= now) return { label: t("statusExpired"), cls: "border-red-400/20 bg-red-400/10 text-red-300" };
  if (key.tokenUsed >= key.tokenQuota) return { label: t("statusQuotaExhausted"), cls: "border-amber-400/20 bg-amber-400/10 text-amber-300" };
  return { label: t("statusActive"), cls: "border-accent/20 bg-accent/10 text-accent" };
}

function orderStatus(status: string, t: TFunc) {
  const styles: Record<string, { label: string; cls: string }> = {
    APPROVED: { label: t("orderApproved"), cls: "bg-emerald-400/10 text-emerald-300" },
    PENDING: { label: t("orderPending"), cls: "bg-amber-400/10 text-amber-300" },
    REJECTED: { label: t("orderRejected"), cls: "bg-red-400/10 text-red-300" },
    CANCELLED: { label: t("orderCancelled"), cls: "bg-white/[0.05] text-muted-foreground" },
  };
  return styles[status] ?? { label: status, cls: "bg-white/[0.05] text-muted-foreground" };
}

export default async function PackagesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const t = await getTranslations("MyPackages");
  const locale = await getLocale();

  const [keys, orders, packageModels] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId, billingMode: "TOKEN_PACKAGE" },
      orderBy: { createdAt: "desc" },
      include: {
        // Order pertama yang menerbitkan key ini = paket asal (untuk renew).
        orders: { orderBy: { createdAt: "asc" }, take: 1, select: { packageId: true } },
      },
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
    getEnabledPackageModels(),
  ]);

  // Paket yang masih bisa di-renew (aktif & bertipe TOKEN_PACKAGE), dipetakan
  // per id untuk tombol Renew pada setiap kartu key.
  const sourcePackageIds = [
    ...new Set(
      keys
        .map((key) => key.orders[0]?.packageId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const renewablePackages = sourcePackageIds.length
    ? await prisma.package.findMany({
        where: { id: { in: sourcePackageIds }, isActive: true, productType: "TOKEN_PACKAGE" },
        select: { id: true, price: true },
      })
    : [];
  const renewableById = new Map(renewablePackages.map((p) => [p.id, p]));

  const now = new Date();
  const activeKeys = keys.filter((key) =>
    key.enabled && key.isActive && (!key.expiresAt || key.expiresAt > now) && key.tokenUsed < key.tokenQuota,
  );
  const totalRemaining = activeKeys.reduce((sum, key) => sum + (key.tokenQuota - key.tokenUsed), 0n);
  // Flat list sorted by provider (stable sort keeps the admin-defined `sort`
  // order within each provider) so the grid renders uniform, tidy cells.
  const sortedModels = [...packageModels].sort((a, b) => a.provider.localeCompare(b.provider));
  const providerCount = new Set(packageModels.map((model) => model.provider)).size;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-transparent px-5 py-6 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/[0.08] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              <span className="h-px w-5 bg-accent/60" /> {t("eyebrow")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <Link href="/pricing" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110">
            {t("buyNewPackage")}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label={t("summaryActivePackages")} value={activeKeys.length.toLocaleString(locale)} detail={t("summaryActiveDetail")} accent />
        <SummaryCard label={t("summaryTotalRemaining")} value={formatNumber(totalRemaining, locale)} detail={t("summaryTotalRemainingDetail")} />
        <SummaryCard label={t("summaryTotalPurchases")} value={orders.length.toLocaleString(locale)} detail={t("summaryTotalPurchasesDetail")} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015]">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{t("modelsTitle")}</h2>
            <span className="rounded-full border border-accent/15 bg-accent/[0.07] px-2 py-0.5 font-mono text-[10px] text-accent">
              {t("modelsActiveCount", { count: packageModels.length })}
            </span>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {t("providersCount", { count: providerCount })}
          </span>
        </div>

        {packageModels.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-muted-foreground">
            {t("modelsEmpty")}
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {sortedModels.map((model) => (
              <div
                key={model.id}
                className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-accent/25 hover:bg-accent/[0.03]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-foreground/80">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />
                    <span className="truncate">{model.provider}</span>
                  </span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide ${model.supportsStreaming ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.05] text-muted-foreground"}`}>
                    {model.supportsStreaming ? t("streamBadge") : t("nonStreamBadge")}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <code className="min-w-0 truncate font-mono text-[12px] text-foreground/90" title={model.modelId}>
                    {model.modelId}
                  </code>
                  <CopyChip text={model.modelId} />
                </div>
                <div className="mt-1 truncate text-[10px] text-muted-foreground" title={model.name}>
                  {model.name}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>{t("modelsFooterNote")}</span>
          <code className="text-foreground/70">GET {PACKAGE_BASE_URL}/models</code>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">{t("keysTitle")}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("keysSubtitle")}</p>
        </div>

        {keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-accent">
              <PackageIcon />
            </div>
            <h3 className="mt-4 text-sm font-semibold">{t("keysEmptyTitle")}</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">{t("keysEmptyDesc")}</p>
            <Link href="/pricing" className="mt-5 inline-flex rounded-lg border border-accent/20 bg-accent/[0.08] px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/[0.12]">{t("keysEmptyCta")}</Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {keys.map((key) => {
              const remaining = key.tokenQuota > key.tokenUsed ? key.tokenQuota - key.tokenUsed : 0n;
              const usedPercentage = key.tokenQuota > 0n
                ? Math.min(100, (Number(key.tokenUsed) / Number(key.tokenQuota)) * 100)
                : 100;
              const status = keyStatus(key, now, t);

              return (
                <article key={key.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] p-5">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{key.name || key.label || t("defaultKeyName")}</h3>
                      <code className="mt-1 block text-[11px] text-muted-foreground">{key.prefix || "sk_live_"}••••••{key.last4 || "••••"}</code>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${status.cls}`}>{status.label}</span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{t("quotaRemaining")}</div>
                        <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{formatNumber(remaining, locale)}</div>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">{t("quotaOfTotal", { quota: formatNumber(key.tokenQuota, locale) })}</div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all" style={{ width: `${100 - usedPercentage}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                      <span>{t("percentUsed", { percent: usedPercentage.toFixed(1) })}</span>
                      <span>{remainingTime(key.expiresAt, now, t)}</span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 text-[11px]">
                      <Info label={t("activeUntil")} value={formatDate(key.expiresAt, locale, t)} />
                      <Info label={t("tokensUsed")} value={formatNumber(key.tokenUsed, locale)} mono />
                      <Info label={t("totalRequests")} value={key.requestCount.toLocaleString(locale)} mono />
                      <Info label={t("lastUsed")} value={key.lastUsedAt ? formatDate(key.lastUsedAt, locale, t) : t("neverUsed")} />
                    </dl>

                    <div className="mt-4 rounded-lg border border-white/[0.07] bg-black/20 p-3">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("apiKeyLabel")}</div>
                      <div className="mt-1.5">
                        {key.key ? (
                          <RevealKey
                            rawKey={key.key}
                            isExpired={key.expiresAt ? key.expiresAt <= now : false}
                            labels={{ show: t("revealShow"), hide: t("revealHide"), copy: t("copy") }}
                          />
                        ) : (
                          <RegeneratePackageKey
                            keyId={key.id}
                            maskedKey={`${key.prefix || "sk_live_"}••••••${key.last4 || "••••"}`}
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-white/[0.07] bg-black/20 p-3">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("baseUrlLabel")}</div>
                      <code className="mt-1.5 block break-all text-[11px] text-accent">{PACKAGE_BASE_URL}</code>
                    </div>

                    {(() => {
                      const sourcePackageId = key.orders[0]?.packageId;
                      const renewPkg = sourcePackageId ? renewableById.get(sourcePackageId) : undefined;
                      if (!sourcePackageId || !renewPkg) return null;
                      return (
                        <div className="mt-4 border-t border-white/[0.06] pt-4">
                          <Link
                            href={`/checkout/${sourcePackageId}?renew=${key.id}`}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.08] px-4 py-2.5 text-xs font-semibold text-accent transition hover:bg-accent/[0.14]"
                          >
                            {t("renewButton")} · Rp{renewPkg.price.toLocaleString(locale)}
                          </Link>
                          <p className="mt-1.5 text-center text-[10px] leading-relaxed text-muted-foreground">
                            {t("renewNote")}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">{t("historyTitle")}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("historySubtitle")}</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.015]">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-white/[0.07] bg-white/[0.025]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("thPackage")}</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("thDate")}</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground">{t("thQuota")}</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground">{t("thPrice")}</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("thPayment")}</th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-muted-foreground">{t("thStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {orders.map((order) => {
                const status = orderStatus(order.status, t);
                return (
                  <tr key={order.id} className="transition hover:bg-white/[0.025]">
                    <td className="px-4 py-3 font-medium">{order.package.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(order.createdAt, locale, t)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatNumber(order.tokenQuotaSnapshot ?? order.package.tokenQuota, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">Rp{order.amount.toLocaleString(locale)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.paymentMethod.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-center"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${status.cls}`}>{status.label}</span></td>
                  </tr>
                );
              })}
              {orders.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">{t("historyEmpty")}</td></tr>}
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
