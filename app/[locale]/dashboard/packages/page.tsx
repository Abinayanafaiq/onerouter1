import type { ReactNode } from "react";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getEnabledPackageModels } from "@/app/lib/package-models";
import { CopyChip } from "@/app/components/copy-chip";
import { RevealKey } from "../reveal-key";
import { RegeneratePackageKey } from "./regenerate-package-key";
import { CleanupPackagesButton, DeletePackageButton } from "./delete-package";
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
  if (!key.enabled || !key.isActive) return { label: t("statusDisabled"), cls: "border-white/10 bg-white/[0.04] text-muted-foreground", tint: "#8b93a1", live: false };
  if (key.expiresAt && key.expiresAt <= now) return { label: t("statusExpired"), cls: "border-red-400/20 bg-red-400/10 text-red-300", tint: "#f87171", live: false };
  if (key.tokenUsed >= key.tokenQuota) return { label: t("statusQuotaExhausted"), cls: "border-amber-400/20 bg-amber-400/10 text-amber-300", tint: "#fbbf24", live: false };
  return { label: t("statusActive"), cls: "border-accent/20 bg-accent/10 text-accent", tint: "#b8ff45", live: true };
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
      where: { userId, billingMode: "TOKEN_PACKAGE", deletedAt: null },
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
         select: { id: true, price: true, isPromo: true },
      })
    : [];
  const renewableById = new Map(renewablePackages.map((p) => [p.id, p]));

  const now = new Date();
  const activeKeys = keys.filter((key) =>
    key.enabled && key.isActive && (!key.expiresAt || key.expiresAt > now) && key.tokenUsed < key.tokenQuota,
  );
  const inactiveCount = keys.length - activeKeys.length;
  const totalRemaining = activeKeys.reduce((sum, key) => sum + (key.tokenQuota - key.tokenUsed), 0n);
  // Flat list sorted by provider (stable sort keeps the admin-defined `sort`
  // order within each provider) so the grid renders uniform, tidy cells.
  const sortedModels = [...packageModels].sort((a, b) => a.provider.localeCompare(b.provider));
  const providerCount = new Set(packageModels.map((model) => model.provider)).size;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
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
          <Link href="/pricing" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t("buyNewPackage")}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label={t("summaryActivePackages")}
          value={activeKeys.length.toLocaleString(locale)}
          detail={t("summaryActiveDetail")}
          accent
          icon={<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9ZM4 7.5l8 4.5 8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />}
        />
        <SummaryCard
          label={t("summaryTotalRemaining")}
          value={formatNumber(totalRemaining, locale)}
          detail={t("summaryTotalRemainingDetail")}
          icon={<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H13L13 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        />
        <SummaryCard
          label={t("summaryTotalPurchases")}
          value={orders.length.toLocaleString(locale)}
          detail={t("summaryTotalPurchasesDetail")}
          icon={<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        />
      </section>

      {/* Paket yang dibeli */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading title={t("keysTitle")} subtitle={t("keysSubtitle")} />
          {inactiveCount > 0 && <CleanupPackagesButton count={inactiveCount} />}
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
          <div className="grid gap-5 lg:grid-cols-2">
            {keys.map((key) => {
              const remaining = key.tokenQuota > key.tokenUsed ? key.tokenQuota - key.tokenUsed : 0n;
              const usedPercentage = key.tokenQuota > 0n
                ? Math.min(100, (Number(key.tokenUsed) / Number(key.tokenQuota)) * 100)
                : 100;
              const remainingPercentage = 100 - usedPercentage;
              const status = keyStatus(key, now, t);
              const barClass = remainingPercentage > 50
                ? "from-accent to-emerald-400"
                : remainingPercentage > 20
                  ? "from-amber-300 to-amber-500"
                  : "from-red-400 to-rose-500";
              const sourcePackageId = key.orders[0]?.packageId;
              const renewPkg = sourcePackageId ? renewableById.get(sourcePackageId) : undefined;
              const canRenew = Boolean(sourcePackageId && renewPkg && !renewPkg.isPromo);

              return (
                <article
                  key={key.id}
                  className="group relative isolate flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition duration-300 hover:border-white/[0.16] hover:bg-white/[0.035]"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `radial-gradient(70% 100% at 50% 0%, ${status.tint}1f, transparent 70%)` }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-8 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${status.tint}, transparent)` }}
                  />

                  <div className="flex items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30 text-accent">
                        <PackageIcon />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold tracking-tight">{key.name || key.label || t("defaultKeyName")}</h3>
                        <code className="mt-0.5 block truncate text-[11px] text-muted-foreground">{key.prefix || "sk_live_"}••••••{key.last4 || "••••"}</code>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${status.cls}`}>
                        {status.live && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                          </span>
                        )}
                        {status.label}
                      </span>
                      <DeletePackageButton
                        keyId={key.id}
                        name={key.name || key.label || t("defaultKeyName")}
                        live={status.live}
                      />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{t("quotaRemaining")}</div>
                        <div
                          className="mt-1.5 truncate bg-clip-text text-3xl font-bold leading-none tracking-tight text-transparent sm:text-4xl"
                          style={{ backgroundImage: `linear-gradient(135deg, #ffffff 20%, ${status.tint})` }}
                        >
                          {formatNumber(remaining, locale)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[11px] text-muted-foreground">{t("quotaOfTotal", { quota: formatNumber(key.tokenQuota, locale) })}</div>
                    </div>

                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className={`h-full rounded-full bg-gradient-to-r transition-all ${barClass}`} style={{ width: `${remainingPercentage}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between gap-3 text-[11px] text-muted-foreground">
                      <span>{t("percentUsed", { percent: usedPercentage.toFixed(1) })}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
                          <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {remainingTime(key.expiresAt, now, t)}
                      </span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-2 text-[11px]">
                      <Info label={t("activeUntil")} value={formatDate(key.expiresAt, locale, t)} />
                      <Info label={t("tokensUsed")} value={formatNumber(key.tokenUsed, locale)} mono />
                      <Info label={t("totalRequests")} value={key.requestCount.toLocaleString(locale)} mono />
                      <Info label={t("lastUsed")} value={key.lastUsedAt ? formatDate(key.lastUsedAt, locale, t) : t("neverUsed")} />
                    </dl>

                    <div className="mt-4 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-black/25">
                      <div className="p-3.5">
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
                      <div className="p-3.5">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("baseUrlLabel")}</div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <code className="min-w-0 break-all text-[11px] text-accent">{PACKAGE_BASE_URL}</code>
                          <CopyChip text={PACKAGE_BASE_URL} />
                        </div>
                      </div>
                    </div>

                    {canRenew && sourcePackageId && renewPkg && (
                      <div className="mt-auto pt-5">
                        <Link
                          href={`/checkout/${sourcePackageId}?renew=${key.id}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/[0.08] px-4 py-3 text-xs font-semibold text-accent transition hover:border-accent/45 hover:bg-accent/[0.14]"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                            <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {t("renewButton")} · Rp{renewPkg.price.toLocaleString(locale)}
                        </Link>
                        <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
                          {t("renewNote")}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Riwayat pembelian */}
      <section className="space-y-4">
        <SectionHeading title={t("historyTitle")} subtitle={t("historySubtitle")} />
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-white/[0.07] bg-white/[0.025]">
              <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-3 text-left font-medium">{t("thPackage")}</th>
                <th className="px-5 py-3 text-left font-medium">{t("thDate")}</th>
                <th className="px-5 py-3 text-right font-medium">{t("thQuota")}</th>
                <th className="px-5 py-3 text-right font-medium">{t("thPrice")}</th>
                <th className="px-5 py-3 text-left font-medium">{t("thPayment")}</th>
                <th className="px-5 py-3 text-center font-medium">{t("thStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {orders.map((order) => {
                const status = orderStatus(order.status, t);
                return (
                  <tr key={order.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5 font-medium">{order.package.name}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-muted-foreground">{formatDate(order.createdAt, locale, t)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">{formatNumber(order.tokenQuotaSnapshot ?? order.package.tokenQuota, locale)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">Rp{order.amount.toLocaleString(locale)}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{order.paymentMethod.replaceAll("_", " ")}</td>
                    <td className="px-5 py-3.5 text-center"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${status.cls}`}>{status.label}</span></td>
                  </tr>
                );
              })}
              {orders.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-xs text-muted-foreground">{t("historyEmpty")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Model yang tersedia */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold tracking-tight">{t("modelsTitle")}</h2>
            <span className="rounded-full border border-accent/15 bg-accent/[0.07] px-2 py-0.5 font-mono text-[10px] text-accent">
              {t("modelsActiveCount", { count: packageModels.length })}
            </span>
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {t("providersCount", { count: providerCount })}
          </span>
        </div>

        {packageModels.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-muted-foreground">
            {t("modelsEmpty")}
          </div>
        ) : (
          <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {sortedModels.map((model) => (
              <div
                key={model.id}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 transition hover:border-accent/25 hover:bg-accent/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <code className="block truncate font-mono text-[12px] text-foreground/90" title={model.modelId}>
                    {model.modelId}
                  </code>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />
                    <span className="truncate">{model.provider}</span>
                    <span aria-hidden="true" className="text-white/20">•</span>
                    <span className={`shrink-0 ${model.supportsStreaming ? "text-emerald-300" : ""}`}>
                      {model.supportsStreaming ? t("streamBadge") : t("nonStreamBadge")}
                    </span>
                  </div>
                </div>
                <CopyChip text={model.modelId} />
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>{t("modelsFooterNote")}</span>
          <code className="text-foreground/70">GET {PACKAGE_BASE_URL}/models</code>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function SummaryCard({ label, value, detail, accent, icon }: { label: string; value: string; detail: string; accent?: boolean; icon: ReactNode }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${accent ? "border-accent/20 bg-accent/[0.05]" : "border-white/[0.08] bg-white/[0.02]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</div>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${accent ? "border-accent/25 bg-accent/10 text-accent" : "border-white/10 bg-white/[0.03] text-muted-foreground"}`}>
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">{icon}</svg>
        </span>
      </div>
      <div className={`mt-2 truncate text-3xl font-bold tracking-tight ${accent ? "text-accent" : ""}`}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 truncate text-foreground/90 ${mono ? "font-mono" : ""}`} title={value}>{value}</dd>
    </div>
  );
}

function PackageIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9ZM4 7.5l8 4.5 8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}
