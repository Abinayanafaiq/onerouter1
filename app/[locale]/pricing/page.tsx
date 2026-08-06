import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/app/components/site-header";
import { ModelPricingTable } from "@/app/components/model-pricing-table";
import { FaqJsonLd } from "@/app/components/faq-json-ld";
import { getAllPackages } from "@/app/lib/packages";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("pricingTitle"),
    description: t("pricingDescription"),
    alternates: {
      canonical: `/${locale}/pricing`,
      languages: { "id-ID": "/id/pricing", "en-US": "/en/pricing", "x-default": "/id/pricing" },
    },
    openGraph: {
      title: `${t("pricingTitle")} | 9inference`,
      description: t("pricingDescription"),
      url: `/${locale}/pricing`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${t("pricingTitle")} | 9inference`,
      description: t("pricingDescription"),
    },
  };
}

const TOKS_TO_RP = 1000;
const TOKS_TO_USD = 0.0553;

const TRUST_BADGES = [
  {
    titleKey: "trustNoSub",
    descKey: "trustNoSubDesc",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    titleKey: "trustTopup",
    descKey: "trustTopupDesc",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    titleKey: "trustTransparent",
    descKey: "trustTransparentDesc",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    titleKey: "trustSecureBank",
    descKey: "trustSecureBankDesc",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const TESTIMONIALS = [
  {
    quoteKey: "testimonial1Quote",
    name: "Andi Pratama",
    role: "CTO, PinjamCepat",
    initials: "AP",
  },
  {
    quoteKey: "testimonial2Quote",
    name: "Sarah Wijaya",
    role: "ML Lead, Univ. Indonesia",
    initials: "SW",
  },
  {
    quoteKey: "testimonial3Quote",
    name: "Daniel Tan",
    role: "Founder, SaaSKit",
    initials: "DT",
  },
];

const FAQS = [
  { qKey: "faq1Q", aKey: "faq1A" },
  { qKey: "faq2Q", aKey: "faq2A" },
  { qKey: "faq3Q", aKey: "faq3A" },
  { qKey: "faq4Q", aKey: "faq4A" },
  { qKey: "faq5Q", aKey: "faq5A" },
  { qKey: "faq6Q", aKey: "faq6A" },
  { qKey: "faq7Q", aKey: "faq7A" },
  { qKey: "faq8Q", aKey: "faq8A" },
  { qKey: "faq9Q", aKey: "faq9A" },
];

const COMPARISON = [
  { featureKey: "cmpOneKey", ours: true, direct: false },
  { featureKey: "cmpFailover", ours: true, direct: false },
  { featureKey: "cmpPayPerToken", ours: true, direct: true },
  { featureKey: "cmpOpenAiSdk", ours: true, direct: false },
  { featureKey: "cmpUnifiedBilling", ours: true, direct: false },
  { featureKey: "cmpRateLimit", ours: true, direct: false },
  { featureKey: "cmpManageAccounts", ours: false, direct: true },
  { featureKey: "cmpInvoices", ours: false, direct: true },
];

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pricing");
  const tc = await getTranslations("Common");
  const tt = await getTranslations("Terms");
  const tokenPackages = await getAllPackages();
  const faqs = FAQS.map((f) => ({ q: t(f.qKey), a: t(f.aKey) }));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <FaqJsonLd faqs={faqs} />

      <section className="relative px-4 pt-32 pb-16 sm:px-6 sm:pt-40 sm:pb-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 15% 0%, rgba(0,255,136,0.08) 0%, transparent 60%), radial-gradient(50% 50% at 100% 0%, rgba(99,102,241,0.10) 0%, transparent 55%)",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1.5 text-[12px] font-medium text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {t("badge")}
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="glass relative overflow-hidden rounded-2xl p-6 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 -z-10"
                style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(0,255,136,0.10), transparent 70%)" }}
                aria-hidden
              />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                {t("conversionTitle")}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="text-[11px] text-muted-foreground">1 TOKS</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">1 TOKS</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t("unitCredit")}</div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="text-[11px] text-muted-foreground">{t("idrLabel")}</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">
                    Rp{TOKS_TO_RP.toLocaleString(locale)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t("perToks")}</div>
                </div>
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                  <div className="text-[11px] text-accent">{t("usdLabel")}</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">
                    US${TOKS_TO_USD.toFixed(4)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t("perToks")}</div>
                </div>
              </div>
              <p className="mt-4 text-[12px] text-muted-foreground">
                {t("conversionNote")}
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="btn-accent group inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm"
            >
              {tc("getApiKey")}
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-7 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              {tc("topUp")}
            </Link>
          </div>
          <p className="mt-5 text-[13px] text-muted-foreground">
            {t.rich("twoWaysPay", {
              payg: (chunks) => (
                <a href="#payg" className="font-medium text-accent underline underline-offset-2 hover:brightness-110">
                  {chunks}
                </a>
              ),
              paket: (chunks) => (
                <a href="#paket" className="font-medium text-accent underline underline-offset-2 hover:brightness-110">
                  {chunks}
                </a>
              ),
            })}
          </p>
          <p className="mt-4 text-[12px] text-muted-foreground">
            {t("noCardNote")}
          </p>
          <p className="mt-3 text-[12px] text-muted-foreground">
            {tt.rich("agreePurchase", {
              link: (chunks) => (
                <Link href="/terms" className="text-foreground underline underline-offset-2 hover:text-accent">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{t("waysEyebrow")}</span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t("waysTitle")}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("waysDesc")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="glass relative overflow-hidden rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  {t("paygBadge")}
                </span>
                <span className="text-[11px] text-muted-foreground">{t("paygTag")}</span>
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight">{t("paygTitle")}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {t("paygDesc")}
              </p>
              <ul className="mt-5 space-y-2.5 text-[13px] text-muted-foreground">
                <li className="flex gap-2"><span className="text-accent">✓</span>{t("paygPoint1")}</li>
                <li className="flex gap-2"><span className="text-accent">✓</span>{t("paygPoint2")}</li>
                <li className="flex gap-2"><span className="text-accent">✓</span>{t("paygPoint3")}</li>
              </ul>
              <a
                href="#payg"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.08]"
              >
                {t("paygCta")}
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M12 5v14m0 0 6-6m-6 6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </article>

            <article className="glass relative overflow-hidden rounded-2xl border-accent/30 p-6 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 -z-10"
                style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(0,255,136,0.08), transparent 70%)" }}
                aria-hidden
              />
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-black">
                  {t("paketBadge")}
                </span>
                <span className="text-[11px] text-muted-foreground">{t("paketTag")}</span>
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight">{t("paketTitle")}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {t("paketDesc")}
              </p>
              <ul className="mt-5 space-y-2.5 text-[13px] text-muted-foreground">
                <li className="flex gap-2"><span className="text-accent">✓</span>{t("paketPoint1")}</li>
                <li className="flex gap-2"><span className="text-accent">✓</span>{t("paketPoint2")}</li>
                <li className="flex gap-2"><span className="text-accent">✓</span>{t("paketPoint3")}</li>
              </ul>
              <a
                href="#paket"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
              >
                {t("paketCta")}
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M12 5v14m0 0 6-6m-6 6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </article>
          </div>
        </div>
      </section>

      <section id="paket" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{t("packagesEyebrow")}</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t("packagesTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("packagesDesc")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {tokenPackages.map((pkg) => {
              const soldOut = pkg.stock <= 0;
              const lowStock = !soldOut && pkg.stock <= 5;
              return (
              <article key={pkg.id} className={`glass relative overflow-hidden rounded-2xl p-6 ${pkg.highlight ? "border-accent/30" : (pkg.allowedModels?.length ?? 0) > 0 ? "border-amber-400/25" : ""}`}>
                {pkg.highlight && <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-black">{t("bestValueBadge")}</span>}
                {!pkg.highlight && (pkg.allowedModels?.length ?? 0) > 0 && (
                  <span className="absolute right-4 top-4 rounded-full bg-amber-400/90 px-2.5 py-1 text-[10px] font-semibold text-black">{t("specialBadge")}</span>
                )}
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{pkg.name}</div>
                <div className="mt-5 text-3xl font-bold tracking-tight">Rp{pkg.price.toLocaleString(locale)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("activeDuration", { days: pkg.durationDays })}
                </div>
                <div className={`mt-1.5 text-xs font-medium ${soldOut ? "text-red-400" : lowStock ? "text-amber-300" : "text-muted-foreground"}`}>
                  {soldOut
                    ? t("soldOut")
                    : lowStock
                      ? t("stockLow", { count: pkg.stock.toLocaleString(locale) })
                      : t("stockLeft", { count: pkg.stock.toLocaleString(locale) })}
                </div>
                <div className="mt-6 border-y border-white/[0.07] py-4">
                  <div className="text-2xl font-semibold text-accent">
                    {t("quotaMillion", { value: (Number(pkg.tokenQuota) / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 }) })}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t("tokenIoLabel")}</div>
                </div>
                <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground">
                  {pkg.features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-accent">✓</span>{feature}</li>)}
                </ul>
                {soldOut ? (
                  <span className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-muted-foreground">
                    {t("soldOutButton")}
                  </span>
                ) : (
                  <Link href={`/checkout/${pkg.id}`} className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${pkg.highlight ? "bg-accent text-black hover:brightness-110" : "border border-white/12 bg-white/[0.04] hover:bg-white/[0.08]"}`}>
                    {t("buyPackage", { name: pkg.name })}
                  </Link>
                )}
              </article>
              );
            })}
          </div>
          <p className="mt-5 text-center text-[11px] text-muted-foreground">{t("packagesFootnote")}</p>
        </div>
      </section>

      <section id="payg" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("ratesEyebrow")}
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("ratesTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
              {t("ratesDesc")}
            </p>
          </div>

          <ModelPricingTable />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.rich("catalogNote", {
              catalog: (chunks) => (
                <Link href="/models" className="text-accent underline">
                  {chunks}
                </Link>
              ),
              guide: (chunks) => (
                <Link href="/blog/api-model-ai-murah-indonesia" className="text-accent underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
            <span>
              <strong className="text-foreground">Rp1.000</strong> = 1 TOKS = <strong className="text-foreground">US$0.0553</strong>
            </span>
            <span className="hidden h-3 w-px bg-white/10 sm:inline-block" />
            <span>{t("perMillionNote")}</span>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_BADGES.map((b) => (
              <div key={b.titleKey} className="glass card-hover rounded-2xl p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-accent">
                  {b.icon}
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                  {t(b.titleKey)}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {t(b.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("whyEyebrow")}
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("whyTitle")}
            </h2>
          </div>

          <div className="glass mt-10 overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-left">
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("compareCapability")}
                  </th>
                  <th className="px-5 py-4 text-center text-[13px] font-semibold text-accent">
                    9inference
                  </th>
                  <th className="px-5 py-4 text-center text-[13px] font-semibold text-muted-foreground">
                    {t("compareDirectColumn")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {COMPARISON.map((row) => (
                  <tr key={row.featureKey} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 text-[13px] text-foreground">{t(row.featureKey)}</td>
                    <td className="px-5 py-3.5 text-center">
                      {row.ours ? (
                        <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-5 w-5 text-accent">
                          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {row.direct ? (
                        <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-5 w-5 text-muted-foreground">
                          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-5 w-5 text-muted-foreground/30">
                          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="relative px-4 py-16 sm:px-6 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.05), transparent 70%)" }}
          aria-hidden
        />
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("testimonialsEyebrow")}
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("testimonialsTitle")}
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((tm) => (
              <figure key={tm.name} className="glass card-hover flex flex-col rounded-2xl p-6">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-accent/60">
                  <path d="M7 7h4v6c0 3-2 5-4 5V7Zm10 0h4v6c0 3-2 5-4 5V7Z" fill="currentColor" />
                </svg>
                <blockquote className="mt-3 flex-1 text-[13px] leading-relaxed text-foreground/90">
                  {t(tm.quoteKey)}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
                    {tm.initials}
                  </span>
                  <div className="leading-tight">
                    <div className="text-[13px] font-semibold text-foreground">{tm.name}</div>
                    <div className="text-[11px] text-muted-foreground">{tm.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("faqEyebrow")}
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("faqHeadline")}
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="glass group rounded-xl border border-white/[0.06] p-5 transition hover:border-white/10"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold text-foreground">
                  {f.q}
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="glass relative overflow-hidden rounded-3xl p-12 text-center sm:p-20">
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(50% 60% at 50% 0%, rgba(0,255,136,0.10), transparent 70%), radial-gradient(50% 60% at 50% 100%, rgba(99,102,241,0.10), transparent 70%)",
              }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-30" aria-hidden />

            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1.5 text-[12px] font-medium text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {t("ctaBadge")}
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("ctaHeadline")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              {t("ctaDescription")}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-accent group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm"
              >
                {t("ctaApiKeyButton")}
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/dashboard/docs"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-7 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                {t("readDocs")}
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("ctaPoint1")}
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("ctaPoint2")}
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("ctaPoint3")}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
