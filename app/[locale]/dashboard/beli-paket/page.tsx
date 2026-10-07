import { Link } from "@/i18n/navigation";
import { getAllPackages, formatTokenQuota, formatDuration } from "@/app/lib/packages";
import { getLocale, getTranslations } from "next-intl/server";
import type { PackageDef } from "@/app/lib/packages";
import PackagePicker from "./package-picker";
import { PackageBrandIcon } from "@/app/components/package-brand-icon";
import { PackageCover } from "@/app/components/package-cover";

export const dynamic = "force-dynamic";

const modelGroups = [
  { key: "glm", label: "GLM", background: "bg-sky-400/10 border-sky-400/20" },
  { key: "kimi", label: "Kimi", background: "bg-violet-400/10 border-violet-400/20" },
  { key: "deepseek", label: "DeepSeek", background: "bg-cyan-400/10 border-cyan-400/20" },
  { key: "gemini", label: "Gemini", background: "bg-blue-400/10 border-blue-400/20" },
  { key: "qwen", label: "Qwen", background: "bg-fuchsia-400/10 border-fuchsia-400/20" },
] as const;

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
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grouped.get(key)!.map((pkg) => {
            const soldOut = pkg.stock <= 0;
            const lowStock = !soldOut && pkg.stock <= 5;
            return (
            <article
              key={pkg.id}
              className={`relative flex flex-col overflow-hidden rounded-[1.8rem] border p-2.5 pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.15)] sm:p-3 sm:pb-5 ${
                pkg.isPromo
                  ? "border-rose-400/20 bg-[#171416]"
                  : pkg.highlight
                  ? "border-accent/30"
                  : (pkg.allowedModels?.length ?? 0) > 0
                    ? "border-amber-400/25"
                    : "border-white/[0.08]"
              } ${pkg.isPromo ? "" : "bg-white/[0.02]"}`}
            >
              <PackageCover group={key} />
              <div className="mx-2 mt-4 flex min-h-6 flex-wrap items-center gap-2 sm:mx-3">
                {pkg.isPromo && (
                  <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold text-rose-200">
                    {t("promoBadge")}
                  </span>
                )}
                {pkg.highlight && (
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-black">{t("bestValue")}</span>
                )}
                {!pkg.highlight && (pkg.allowedModels?.length ?? 0) > 0 && (
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">{t("specialPackage")}</span>
                )}
              </div>
              <h3 className="mx-2 mt-3 break-words text-lg font-semibold leading-snug tracking-tight text-foreground sm:mx-3">
                {pkg.name}
              </h3>
              <div className="mx-2 mt-3 text-2xl font-bold tracking-tight sm:mx-3">
                Rp{pkg.price.toLocaleString(locale)}
              </div>
              {pkg.toksPrice != null && pkg.toksPrice > 0 && (
                <div className="mx-2 mt-0.5 text-xs font-medium text-accent sm:mx-3">
                  atau {pkg.toksPrice.toLocaleString(locale)} TOKS
                </div>
              )}
              <div className="mx-2 mt-1 text-xs text-muted-foreground sm:mx-3">
                {t("oneTimePayment", { duration: formatDuration(pkg.durationDays).toLowerCase() })}
              </div>
              <div
                className={`mx-2 mt-3 text-xs font-medium sm:mx-3 ${
                  soldOut ? "text-red-400" : lowStock ? "text-amber-300" : "text-muted-foreground"
                }`}
              >
                {soldOut
                  ? t("outOfStock")
                  : lowStock
                    ? t("stockLeftLow", { stock: pkg.stock.toLocaleString(locale) })
                    : t("stockLeft", { stock: pkg.stock.toLocaleString(locale) })}
              </div>
              <div className="mx-2 mt-4 flex flex-wrap items-baseline justify-between gap-x-3 border-t border-white/10 pt-3 sm:mx-3">
                <div className="text-lg font-semibold tracking-tight text-accent">{formatTokenQuota(pkg.tokenQuota)}</div>
                <div className="text-[11px] text-muted-foreground">{t("tokenInOut")}</div>
              </div>
              <ul className="mx-2 mt-3 flex-1 space-y-2 text-xs leading-relaxed text-muted-foreground sm:mx-3">
                {pkg.features.slice(2).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {pkg.isPromo && (
                <p className="mx-2 mt-4 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-rose-200/80 sm:mx-3">
                  {t("promoNoRenew")}
                </p>
              )}
              {soldOut ? (
                <span className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-muted-foreground">
                  {t("outOfStockButton")}
                </span>
              ) : (
                <Link
                  href={`/checkout/${pkg.id}`}
                  className={`mt-5 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    pkg.isPromo
                      ? "bg-rose-300 text-rose-950 hover:bg-rose-200"
                      : pkg.highlight
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
