import { Link } from "@/i18n/navigation";
import { getAllPackages, formatTokenQuota, formatDuration } from "@/app/lib/packages";
import { getLocale, getTranslations } from "next-intl/server";
import type { PackageDef } from "@/app/lib/packages";
import PackagePicker from "./package-picker";
import { PackageBrandIcon } from "@/app/components/package-brand-icon";

export const dynamic = "force-dynamic";

const modelGroups = [
  { key: "glm", label: "GLM", background: "bg-sky-400/10 border-sky-400/20" },
  { key: "kimi", label: "Kimi", background: "bg-violet-400/10 border-violet-400/20" },
  { key: "deepseek", label: "DeepSeek", background: "bg-cyan-400/10 border-cyan-400/20" },
  { key: "gemini", label: "Gemini", background: "bg-blue-400/10 border-blue-400/20" },
  { key: "qwen", label: "Qwen", background: "bg-fuchsia-400/10 border-fuchsia-400/20" },
] as const;

// Warna aksen per keluarga model untuk garis atas & glow kartu.
const groupTints: Record<string, string> = {
  general: "#b8ff45",
  glm: "#8db8ff",
  kimi: "#b7a9ff",
  deepseek: "#87c6ff",
  gemini: "#b6c9ff",
  qwen: "#dcbdfc",
  other: "#bbd8ed",
};
const PROMO_TINT = "#fda4af";

function groupPackages(packages: PackageDef[]) {
  const groups = new Map<string, PackageDef[]>();
  const sorted = [...packages].sort((a, b) => a.price - b.price);
  for (const pkg of sorted) {
    const models = pkg.allowedModels ?? [];
    const family = models.length === 0
      ? "general"
      : modelGroups.find(({ key }) => models.every((model) => model.toLowerCase().includes(key)))?.key ?? "other";
    groups.set(family, [...(groups.get(family) ?? []), pkg]);
  }
  return groups;
}

export async function PackageCatalog({ promoOnly = false }: { promoOnly?: boolean }) {
  const allPackages = await getAllPackages();
  const tokenPackages = promoOnly ? allPackages.filter((pkg) => pkg.isPromo) : allPackages;
  const t = await getTranslations("BuyPackage");
  const locale = await getLocale();
  const grouped = groupPackages(tokenPackages);
  const groupOrder = ["general", ...modelGroups.map(({ key }) => key), "other"];

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-transparent px-5 py-6 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/[0.08] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              <span className="h-px w-5 bg-accent/60" /> {t(promoOnly ? "promoEyebrow" : "eyebrow")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(promoOnly ? "promoTitle" : "title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t(promoOnly ? "promoSubtitle" : "subtitle")}
            </p>
          </div>
          <Link
            href="/dashboard/packages"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-foreground transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            {t("myPackages")}
          </Link>
        </div>
      </section>

      {tokenPackages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-14 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-accent">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9ZM4 7.5l8 4.5 8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
            <h3 className="mt-4 text-sm font-semibold">{t(promoOnly ? "promoEmptyTitle" : "emptyTitle")}</h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              {t(promoOnly ? "promoEmptyDesc" : "emptyDesc")}
          </p>
        </div>
      ) : (
        <PackagePicker groups={groupOrder.filter((key) => grouped.has(key)).map((key) => {
            const model = modelGroups.find((item) => item.key === key);
            const title = model?.label ?? (key === "general" ? t("allModelsGroup") : t("otherModelsGroup"));
            return { key, title, content: (
            <section aria-label={title}>
              <div className="mb-4 flex items-center gap-3">
                <span aria-hidden="true" className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-accent ${model?.background ?? "border-accent/20 bg-accent/10"}`}>
                  <PackageBrandIcon group={key} className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                  <p className="text-xs text-muted-foreground">{key === "general" ? t("allModelsDesc") : t("modelGroupDesc", { model: title })}</p>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {grouped.get(key)!.map((pkg) => {
            const soldOut = pkg.stock <= 0;
            const lowStock = !soldOut && pkg.stock <= 5;
            const quota = Number(pkg.tokenQuota);
            const perMillion = quota > 0 ? Math.round(pkg.price / (quota / 1_000_000)) : null;
            const tint = pkg.isPromo ? PROMO_TINT : groupTints[key] ?? groupTints.other;
            return (
            <article
              key={pkg.id}
              className={`group relative isolate flex flex-col overflow-hidden rounded-2xl border bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.04] hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] sm:p-6 ${
                pkg.isPromo
                  ? "border-rose-400/25 hover:border-rose-400/45"
                  : pkg.highlight
                    ? "border-accent/35 hover:border-accent/60"
                    : "border-white/[0.08] hover:border-white/[0.18]"
              }`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(75% 100% at 50% 0%, ${tint}26, transparent 70%)` }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${tint}, transparent)` }}
              />

              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/30 py-1 pl-1.5 pr-3 text-[11px] font-medium text-foreground/80">
                  <span className="grid h-5 w-5 shrink-0 place-items-center">
                    <PackageBrandIcon group={key} className="h-4 w-4" />
                  </span>
                  <span className="truncate">{title}</span>
                </span>
                {pkg.isPromo ? (
                  <span className="shrink-0 rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold text-rose-200">
                    {t("promoBadge")}
                  </span>
                ) : pkg.highlight ? (
                  <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-black">{t("bestValue")}</span>
                ) : (pkg.allowedModels?.length ?? 0) > 0 ? (
                  <span className="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">{t("specialPackage")}</span>
                ) : null}
              </div>

              <h3 className="mt-5 break-words text-base font-semibold leading-snug tracking-tight text-foreground">
                {pkg.name}
              </h3>

              <div className="mt-3">
                <div
                  className="bg-clip-text text-4xl font-bold leading-none tracking-tight text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg, #ffffff 20%, ${tint})` }}
                >
                  {formatTokenQuota(pkg.tokenQuota)}
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">{t("tokenInOut")}</div>
                {perMillion != null && (
                  <div className="mt-3 inline-flex items-baseline gap-1.5 rounded-lg border border-accent/25 bg-accent/[0.08] px-2.5 py-1.5">
                    <span className="text-sm font-bold tracking-tight text-accent">≈ Rp{perMillion.toLocaleString(locale)}</span>
                    <span className="text-[11px] text-foreground/70">{t("perMillionTokens")}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-foreground/80">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {formatDuration(pkg.durationDays)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                    soldOut
                      ? "border-red-400/25 bg-red-400/10 text-red-300"
                      : lowStock
                        ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                        : "border-white/[0.08] bg-white/[0.03] text-foreground/80"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${soldOut ? "bg-red-400" : lowStock ? "bg-amber-300" : "bg-accent"}`}
                  />
                  {soldOut
                    ? t("outOfStock")
                    : lowStock
                      ? t("stockLeftLow", { stock: pkg.stock.toLocaleString(locale) })
                      : t("stockLeft", { stock: pkg.stock.toLocaleString(locale) })}
                </span>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
                {pkg.features.slice(2).map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {pkg.isPromo && (
                <p className="mt-4 rounded-lg border border-rose-400/15 bg-rose-400/[0.06] px-3 py-2 text-[11px] leading-relaxed text-rose-200/90">
                  {t("promoNoRenew")}
                </p>
              )}

              <div className="mt-5 border-t border-white/[0.08] pt-4">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="text-2xl font-bold tracking-tight">Rp{pkg.price.toLocaleString(locale)}</span>
                  {pkg.toksPrice != null && pkg.toksPrice > 0 && (
                    <span className="text-xs font-medium text-accent">atau {pkg.toksPrice.toLocaleString(locale)} TOKS</span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("oneTimePayment", { duration: formatDuration(pkg.durationDays).toLowerCase() })}
                </div>
              </div>

              {soldOut ? (
                <span className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-muted-foreground">
                  {t("outOfStockButton")}
                </span>
              ) : (
                <Link
                  href={`/checkout/${pkg.id}`}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    pkg.isPromo
                      ? "bg-rose-300 text-rose-950 hover:bg-rose-200"
                      : pkg.highlight
                        ? "bg-accent text-black hover:brightness-110"
                        : "border border-white/12 bg-white/[0.05] hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                  }`}
                >
                  <span className="truncate">{t("buyPackage", { name: pkg.name })}</span>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )}
            </article>
            );
          })}
              </div>
            </section>
            ) };
          })} />
      )}

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        {t("footerNote")}
        <br className="hidden sm:block" /> {t("footerPaygQuestion")}{" "}
        <Link href="/dashboard/wallet" className="text-accent underline underline-offset-2">
          {t("footerPaygLink")}
        </Link>
      </p>
    </div>
  );
}

export default function BuyPackagePage() {
  return <PackageCatalog />;
}
