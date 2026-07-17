import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/app/lib/auth";
import { getEnabledModels } from "@/app/lib/models";
import { toModelCardData, type ModelCardData } from "@/app/lib/model-card-data";
import { LandingHeader } from "@/app/components/landing/landing-header";
import { HeroTerminal } from "@/app/components/landing/hero-terminal";
import { AnimatedStats } from "@/app/components/landing/animated-stats";
import { CodeTabs } from "@/app/components/landing/code-tabs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    alternates: {
      canonical: `/${locale}`,
      languages: { "id-ID": "/id", "en-US": "/en", "x-default": "/id" },
    },
    openGraph: {
      title: `9inference — ${t("tagline")}`,
      description: t("homeDescription"),
      type: "website",
      url: `/${locale}`,
      locale: locale === "en" ? "en_US" : "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title: `9inference — ${t("tagline")}`,
      description: t("homeDescription"),
    },
  };
}

const INFRA_ICONS = [
  <svg key="u" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="M4 7h16M4 12h10M4 17h7M17 17l4 4M21 17l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  <svg key="f" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  <svg key="c" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="m8 16-4-4 4-4M16 8l4 4-4 4M14 4l-4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  <svg key="s" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
];

const PROVIDER_DOT: Record<string, string> = {
  GLM: "bg-emerald-400",
  DeepSeek: "bg-violet-400",
  Alibaba: "bg-orange-400",
  "Moonshot AI": "bg-sky-400",
  MiniMax: "bg-pink-400",
};

function capabilityLabel(
  name: string,
  modelId: string,
  labels: { coding: string; fast: string; reasoning: string; vision: string; general: string },
): string {
  const h = (name + " " + modelId).toLowerCase();
  if (/code|coder/.test(h)) return labels.coding;
  if (/fast|flash/.test(h)) return labels.fast;
  if (/vision|vl|image/.test(h)) return labels.vision;
  if (/pro|reason/.test(h)) return labels.reasoning;
  return labels.general;
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const tf = await getTranslations("Footer");
  const tc = await getTranslations("Common");

  const [session, enabledModels] = await Promise.all([auth(), getEnabledModels()]);
  const isAuthed = !!session?.user;
  const models: ModelCardData[] = enabledModels.map(toModelCardData);
  const modelCount = models.length;

  const capLabels = {
    coding: t("capCoding"),
    fast: t("capFast"),
    reasoning: t("capReasoning"),
    vision: t("capVision"),
    general: t("capGeneral"),
  };

  const INFRA_FEATURES = [
    { title: t("featureUnifiedTitle"), desc: t("featureUnifiedDesc"), icon: INFRA_ICONS[0] },
    { title: t("featureFastTitle"), desc: t("featureFastDesc"), icon: INFRA_ICONS[1] },
    { title: t("featureCompatTitle"), desc: t("featureCompatDesc"), icon: INFRA_ICONS[2] },
    { title: t("featureSecureTitle"), desc: t("featureSecureDesc"), icon: INFRA_ICONS[3] },
  ];

  const TRUST_AUDIENCES = [
    { name: t("audienceStartup"), desc: t("audienceStartupDesc") },
    { name: t("audienceDev"), desc: t("audienceDevDesc") },
    { name: t("audienceResearcher"), desc: t("audienceResearcherDesc") },
    { name: t("audienceEngineer"), desc: t("audienceEngineerDesc") },
  ];

  return (
    <div className="landing-shell relative min-h-screen overflow-hidden bg-background">
      <LandingHeader isAuthed={isAuthed} />

      {/* ============================================================
          HERO
          ============================================================ */}
      <section className="landing-section relative min-h-[880px] px-4 pb-24 pt-32 sm:px-6 sm:pb-32 sm:pt-44 lg:flex lg:min-h-screen lg:items-center">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(55% 55% at 8% 10%, rgba(184,255,69,0.12) 0%, transparent 65%), radial-gradient(45% 50% at 100% 5%, rgba(255,112,72,0.10) 0%, transparent 60%)",
          }}
          aria-hidden
        />
        <div className="hero-orbit pointer-events-none absolute -right-72 top-16 -z-10 h-[760px] w-[760px] opacity-70" aria-hidden />
        <div className="hero-orbit pointer-events-none absolute -right-48 top-40 -z-10 h-[520px] w-[520px] opacity-50" aria-hidden />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
          {/* Left: copy */}
          <div className="animate-fade-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 border-l border-accent bg-accent/[0.04] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {t("badge", { count: modelCount })}
            </div>

            {/* Headline */}
            <h1 className="landing-display mt-8 text-[clamp(3.25rem,7vw,6.8rem)] font-semibold leading-[0.88]">
              {t("headline1")}
              <br />
              <span className="gradient-text-accent">{t("headline2")}</span>
              <br />
              {t("headline3")}
            </h1>

            {/* Subheadline */}
            <p className="mt-8 max-w-xl border-l border-white/15 pl-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("subheadline")}
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-accent group inline-flex items-center justify-center gap-2 rounded-sm px-7 py-4 text-sm"
              >
                {t("ctaPrimary")}
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-white/15 bg-white/[0.02] px-7 py-4 text-sm font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/[0.04]"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
            <p className="mt-3 text-[12px] text-muted-foreground">
              {t("setupNote")}
            </p>

            {/* Mini trust row */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.07] pt-5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("noCreditCard")}
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("toksRate")}
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("dropInOpenAI")}
              </span>
            </div>
          </div>

          {/* Right: terminal */}
          <div className="relative animate-fade-up-delay-2 lg:translate-y-8">
            <div className="absolute -left-8 -top-8 hidden font-mono text-[10px] uppercase tracking-[0.25em] text-accent/60 lg:block">01 / API request</div>
            <HeroTerminal />
          </div>
        </div>
      </section>

      {/* ============================================================
          LOGO STRIP / PROVIDERS
          ============================================================ */}
      <section className="landing-section border-y border-white/[0.05] bg-[#b8ff45] py-6 text-[#101208]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
              {t("providersLabel")}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {["GLM", "DeepSeek", "Alibaba Qwen", "Moonshot AI", "MiniMax"].map((p) => (
                <span key={p} className="text-sm font-bold tracking-tight text-black/70 transition hover:text-black">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          DEVELOPER INFRASTRUCTURE
          ============================================================ */}
      <section id="platform" className="landing-section scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="eyebrow-line text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("infraEyebrow")}
            </span>
            <h2 className="landing-display mt-5 text-4xl font-semibold sm:text-6xl">
              {t("infraTitle")}
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              {t("infraDesc")}
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INFRA_FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`glass card-hover rounded-sm p-6 ${i === 0 ? "sm:col-span-2 lg:col-span-1" : ""} ${[`animate-fade-up`, `animate-fade-up-delay-1`, `animate-fade-up-delay-2`, `animate-fade-up-delay-3`][i]}`}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-accent">
                  {f.icon}
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          MODEL SHOWCASE
          ============================================================ */}
      <section id="models" className="landing-section scroll-mt-20 bg-white/[0.018] px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="eyebrow-line text-[11px] font-semibold uppercase tracking-wider text-accent">
                {t("catalogEyebrow")}
              </span>
              <h2 className="landing-display mt-5 text-4xl font-semibold sm:text-6xl">
                {t("catalogTitle")}
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                {t("catalogDesc", { count: modelCount })}
              </p>
            </div>
            <Link
              href="/models"
              className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-[13px] font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              {t("viewAllModelsArrow")}
            </Link>
          </div>

          {models.length === 0 ? (
            <div className="glass mt-12 rounded-2xl p-16 text-center text-sm text-muted-foreground">
              {t("catalogEmpty")}
            </div>
          ) : (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {models.slice(0, 6).map((m) => (
                <ModelShowcaseCard key={m.id} model={m} capLabels={capLabels} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          PERFORMANCE METRICS
          ============================================================ */}
      <section className="landing-section relative px-4 py-24 sm:px-6 sm:py-28">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(60% 80% at 50% 50%, rgba(99,102,241,0.05), transparent 70%)" }}
          aria-hidden
        />
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Performa
            </span>
            <h2 className="landing-display mt-5 text-4xl font-semibold sm:text-6xl">
              Dibangun untuk skala dan kecepatan
            </h2>
          </div>
          <div className="mt-14">
            <AnimatedStats labels={[t('statModels'), t('statContext'), t('statLatency'), t('statUptime')]} />
          </div>
        </div>
      </section>

      {/* ============================================================
          DEVELOPER EXPERIENCE
          ============================================================ */}
      <section className="landing-section px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("dxEyebrow")}
            </span>
            <h2 className="landing-display mt-5 text-4xl font-semibold sm:text-6xl">
              {t("dxTitle")}
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Jika Anda sudah memakai OpenAI SDK, Anda sudah mengenal 9inference. Arahkan client
              ke base URL kami — selesai.
            </p>
          </div>
          <div className="mt-12">
            <CodeTabs />
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING
          ============================================================ */}
      <section id="pricing" className="landing-section scroll-mt-20 bg-white/[0.018] px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("pricingEyebrow")}
            </span>
            <h2 className="landing-display mt-5 text-4xl font-semibold sm:text-6xl">
              {t("pricingTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              {t("pricingDesc")}
            </p>

            {/* TOKS conversion banner */}
            <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-accent/20 bg-accent/5 px-4 py-2 text-[12px]">
              <span className="font-semibold text-accent">1 TOKS</span>
              <span className="text-muted-foreground">=</span>
              <span className="font-semibold text-foreground">Rp1,000</span>
              <span className="text-muted-foreground">=</span>
              <span className="font-semibold text-foreground">US$0.0553</span>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <PremiumPricingTable models={models} t={t} tc={tc} />
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="btn-accent group inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm"
            >
                {t("registerFree")}
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/models"
                className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                {t("viewAllModelsArrow")}
              </Link>
            </div>
            <p className="mt-4 text-center text-[12px] text-muted-foreground">
              Tanpa kartu kredit · Kredit tidak kedaluwarsa · Jaminan refund 14 hari
            </p>
        </div>
      </section>

      {/* ============================================================
          TRUST SECTION
          ============================================================ */}
      <section className="landing-section relative px-4 py-24 sm:px-6 sm:py-32">
        <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(0,255,136,0.04), transparent 70%)" }}
          aria-hidden
        />
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("trustEyebrow")}
            </span>
            <h2 className="landing-display mt-5 text-4xl font-semibold sm:text-6xl">
              {t("trustTitle")}
            </h2>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_AUDIENCES.map((a, i) => (
              <div
                key={a.name}
                className={`glass card-hover rounded-2xl p-6 text-center ${[`animate-fade-up`, `animate-fade-up-delay-1`, `animate-fade-up-delay-2`, `animate-fade-up-delay-3`][i]}`}
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-accent">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="mt-4 text-sm font-semibold tracking-tight text-foreground">
                  {a.name}
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {a.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/register"
              className="btn-accent inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm"
            >
              {t("ctaFinalTitle")}
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
          ============================================================ */}
      <section className="landing-section px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="glass relative overflow-hidden rounded-sm border-accent/20 p-10 text-center sm:p-20">
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
              {modelCount} model · Bayar per token · 1 TOKS = Rp1.000
            </div>

            <h2 className="landing-display mt-6 text-4xl font-semibold sm:text-6xl">
              Hemat biaya AI mulai hari ini
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              {t("registerFree")}, dapat API key instan. Satu endpoint multi-model, bayar hanya token yang dipakai —
              tanpa langganan.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-accent group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm"
              >
                Mulai gratis — API key instan
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/models"
                className="rounded-xl border border-white/10 bg-white/[0.02] px-7 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                Lihat model murah
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("noCreditCard")}
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Jaminan refund 14 hari
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Kredit tidak kedaluwarsa
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="border-t border-white/[0.06] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-[11px] font-bold text-background">
                  9i
                </span>
                <span className="text-[15px] font-semibold tracking-tight">9inference</span>
              </Link>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                {tf("tagline")}
              </p>
            </div>

            <FooterCol
              title={t("providersLabel")}
              links={[
                { label: tf("aiModels"), href: "/models" },
                { label: tf("tokenPricing"), href: "/pricing" },
                { label: tc("blog"), href: "/blog" },
                { label: tc("dashboard"), href: "/dashboard" },
              ]}
            />
            <FooterCol
              title={tf("learn")}
              links={[
                { label: tf("apiCheap"), href: "/blog/api-model-ai-murah-indonesia" },
                { label: tf("deepseekCheap"), href: "/blog/deepseek-api-murah-cara-pakai" },
                { label: tf("openaiAlt"), href: "/blog/alternatif-openai-api-murah" },
                { label: tf("payPerToken"), href: "/blog/bayar-per-token-vs-langganan" },
              ]}
            />
            <FooterCol
              title={tf("account")}
              links={[
                { label: tc("login"), href: "/login" },
                { label: tc("register"), href: "/register" },
                { label: tc("topUp"), href: "/dashboard/wallet" },
              ]}
            />
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
            <p className="text-[12px] text-muted-foreground">
              {tf("copyright", { year: new Date().getFullYear() })}
            </p>
            <p className="text-[12px] text-muted-foreground">
              Bayar hanya yang dipakai. Tanpa langganan. Tanpa biaya tersembunyi.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ===== Helpers ===== */

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[13px] text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModelShowcaseCard({
  model,
  capLabels,
}: {
  model: ModelCardData;
  capLabels: {
    coding: string;
    fast: string;
    reasoning: string;
    vision: string;
    general: string;
  };
}) {
  const cap = capabilityLabel(model.name, model.modelId, capLabels);
  const dot = PROVIDER_DOT[model.provider] ?? "bg-white/40";
  const isLive = !model.maintenanceMode;

  return (
    <div className="glass card-glow group relative flex flex-col rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {model.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            <span className="text-[12px] text-muted-foreground">{model.provider}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
            isLive
              ? "border-accent/25 bg-accent/10 text-accent"
              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          }`}
        >
          {isLive ? "Aktif" : "Pemeliharaan"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-[12px]">
        <div>
          <div className="text-[10px] text-muted-foreground">Konteks</div>
          <div className="mt-0.5 font-semibold text-foreground">
            {model.contextWindow ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Kemampuan</div>
          <div className="mt-0.5 font-semibold text-foreground">{cap}</div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4">
        <code className="flex-1 truncate rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-1.5 font-mono text-[11px] text-foreground/80">
          {model.modelId}
        </code>
        <Link
          href={`/models/${encodeURIComponent(model.modelId)}`}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:border-white/20"
        >
          Pakai model
        </Link>
      </div>
    </div>
  );
}

function PremiumPricingTable({
  models,
  t,
  tc,
}: {
  models: ModelCardData[];
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  if (models.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
        Harga sedang diperbarui.
      </div>
    );
  }
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-left">
              {["Model", "Provider", "Konteks", "Input / 1Jt", "Output / 1Jt", "Status"].map((h) => (
                <th
                  key={h}
                  className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${
                    h === "Input / 1Jt" || h === "Output / 1Jt" ? "text-right" : ""
                  } ${h === "Status" ? "text-center" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {models.map((m) => (
              <tr key={m.id} className="transition hover:bg-white/[0.02]">
                <td className="px-5 py-4">
                  <div className="font-semibold text-foreground">{m.name}</div>
                  <code className="text-[11px] text-muted-foreground">{m.modelId}</code>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${PROVIDER_DOT[m.provider] ?? "bg-white/40"}`} />
                    {m.provider}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {m.contextWindow || "—"}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="font-mono font-semibold text-foreground">
                    Rp{m.inputPricePerMillion.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {(m.inputPricePerMillion / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} TOKS · US${((m.inputPricePerMillion / 1000) * 0.0553).toFixed(2)}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="font-mono font-semibold text-foreground">
                    Rp{m.outputPricePerMillion.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {(m.outputPricePerMillion / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} TOKS · US${((m.outputPricePerMillion / 1000) * 0.0553).toFixed(2)}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  {m.maintenanceMode ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {tc("maintenance")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                      {tc("active")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/[0.08] px-5 py-3.5 text-[11px] text-muted-foreground">
        {t("pricingTableNote")}
      </div>
    </div>
  );
}
