import { Link } from "@/i18n/navigation";
import { getAllPackages, formatTokenQuota, formatDuration } from "@/app/lib/packages";
import { getLocale, getTranslations } from "next-intl/server";
import type { PackageDef } from "@/app/lib/packages";

export const dynamic = "force-dynamic";

const modelGroups = [
  { key: "glm", label: "GLM", symbol: "✳", color: "text-sky-300", background: "bg-sky-400/10 border-sky-400/20" },
  { key: "kimi", label: "Kimi", symbol: "☾", color: "text-violet-300", background: "bg-violet-400/10 border-violet-400/20" },
  { key: "deepseek", label: "DeepSeek", symbol: "≋", color: "text-cyan-300", background: "bg-cyan-400/10 border-cyan-400/20" },
] as const;

function groupPackages(packages: PackageDef[]) {
  const groups = new Map<string, PackageDef[]>();
  for (const pkg of packages) {
    const models = pkg.allowedModels ?? [];
    const family = models.length === 0
      ? "general"
      : modelGroups.find(({ key }) => models.every((model) => model.toLowerCase().includes(key)))?.key ?? "other";
    groups.set(family, [...(groups.get(family) ?? []), pkg]);
  }
  return groups;
}

export default async function BuyPackagePage() {
  const tokenPackages = await getAllPackages();
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
              <span className="h-px w-5 bg-accent/60" /> {t("eyebrow")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t("subtitle")}
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
          <h3 className="mt-4 text-sm font-semibold">{t("emptyTitle")}</h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
            {t("emptyDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-9">
          {groupOrder.filter((key) => grouped.has(key)).map((key) => {
            const model = modelGroups.find((item) => item.key === key);
            const title = model?.label ?? (key === "general" ? t("allModelsGroup") : t("otherModelsGroup"));
            return (
            <section key={key} aria-label={title}>
              <div className="mb-4 flex items-center gap-3">
                <span aria-hidden="true" className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-2xl font-semibold ${model?.background ?? "border-accent/20 bg-accent/10"} ${model?.color ?? "text-accent"}`}>
                  {model?.symbol ?? "✦"}
                </span>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                  <p className="text-xs text-muted-foreground">{key === "general" ? t("allModelsDesc") : t("modelGroupDesc", { model: title })}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grouped.get(key)!.map((pkg) => {
            const soldOut = pkg.stock <= 0;
            const lowStock = !soldOut && pkg.stock <= 5;
            return (
            <article
              key={pkg.id}
              className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white/[0.02] p-6 ${
                pkg.highlight
                  ? "border-accent/30"
                  : (pkg.allowedModels?.length ?? 0) > 0
                    ? "border-amber-400/25"
                    : "border-white/[0.08]"
              }`}
            >
              {pkg.highlight && (
                <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-black">
                  {t("bestValue")}
                </span>
              )}
              {!pkg.highlight && (pkg.allowedModels?.length ?? 0) > 0 && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-400/90 px-2.5 py-1 text-[10px] font-semibold text-black">
                  {t("specialPackage")}
                </span>
              )}
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {pkg.name}
              </div>
              <div className="mt-4 text-3xl font-bold tracking-tight">
                Rp{pkg.price.toLocaleString(locale)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t("oneTimePayment", { duration: formatDuration(pkg.durationDays).toLowerCase() })}
              </div>
              <div
                className={`mt-1.5 text-xs font-medium ${
                  soldOut ? "text-red-400" : lowStock ? "text-amber-300" : "text-muted-foreground"
                }`}
              >
                {soldOut
                  ? t("outOfStock")
                  : lowStock
                    ? t("stockLeftLow", { stock: pkg.stock.toLocaleString(locale) })
                    : t("stockLeft", { stock: pkg.stock.toLocaleString(locale) })}
              </div>
              <div className="mt-5 border-y border-white/[0.07] py-4">
                <div className="text-2xl font-semibold text-accent">{formatTokenQuota(pkg.tokenQuota)}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{t("tokenInOut")}</div>
              </div>
              <ul className="mt-4 flex-1 space-y-2.5 text-xs text-muted-foreground">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {soldOut ? (
                <span className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-muted-foreground">
                  {t("outOfStockButton")}
                </span>
              ) : (
                <Link
                  href={`/checkout/${pkg.id}`}
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    pkg.highlight
                      ? "bg-accent text-black hover:brightness-110"
                      : "border border-white/12 bg-white/[0.04] hover:bg-white/[0.08]"
                  }`}
                >
                  {t("buyPackage", { name: pkg.name })}
                </Link>
              )}
            </article>
            );
          })}
              </div>
            </section>
            );
          })}
        </div>
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
