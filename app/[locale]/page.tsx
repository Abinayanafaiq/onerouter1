import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/app/lib/auth";
import { getEnabledModels } from "@/app/lib/models";
import { toModelCardData, type ModelCardData } from "@/app/lib/model-card-data";
import { serializeJsonLd } from "@/app/lib/json-ld";
import { LandingHeader } from "@/app/components/landing/landing-header";
import { CodeTabs } from "@/app/components/landing/code-tabs";
import { PackagePricing, type LandingPackage } from "@/app/components/landing/package-pricing";
import { MobilePackageCta } from "@/app/components/landing/mobile-package-cta";
import { getAllPackages } from "@/app/lib/packages";
import { HeroIso } from "@/app/components/landing/iso-scene";
import { FeatureTabs } from "@/app/components/landing/feature-tabs";
import { BrandLogo, BrandMark } from "@/app/components/landing/brand-logo";
import { CountUp } from "@/app/components/landing/count-up";
import { PackageBrandIcon, brandGroupOf } from "@/app/components/package-brand-icon";

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

const PROVIDERS = ["GLM", "DeepSeek", "Alibaba Qwen", "Moonshot AI", "MiniMax"];

/** Sama dengan pengelompokan di halaman Beli Paket (dashboard). */
const MODEL_GROUPS = [
  { key: "glm", label: "GLM" },
  { key: "kimi", label: "Kimi" },
  { key: "deepseek", label: "DeepSeek" },
  { key: "gemini", label: "Gemini" },
  { key: "qwen", label: "Qwen" },
  { key: "minimax", label: "MiniMax" },
  { key: "claude", label: "Claude" },
] as const;

function packageGroup(allowedModels: string[]): string {
  if (allowedModels.length === 0) return "general";
  return (
    MODEL_GROUPS.find(({ key }) => allowedModels.every((m) => m.toLowerCase().includes(key)))?.key ?? "other"
  );
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

  // Hanya READ (SELECT) — tidak ada penulisan ke database di halaman ini.
  const [session, enabledModels, allPackages] = await Promise.all([
    auth(),
    getEnabledModels(),
    getAllPackages(),
  ]);
  const isAuthed = !!session?.user;
  const models: ModelCardData[] = enabledModels.map(toModelCardData);
  const modelCount = models.length;
  const isEn = locale === "en";

  /* ---------- Paket token (fokus utama landing page) ---------- */
  // Paket yang stoknya habis tidak ditampilkan di landing page; urut dari harga termurah.
  const landingPackages: LandingPackage[] = allPackages
    .filter((p) => p.stock > 0)
    .sort((a, b) => a.price - b.price)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      toksPrice: p.toksPrice ?? null,
      tokenQuota: Number(p.tokenQuota),
      durationDays: p.durationDays,
      stock: p.stock,
      isPromo: p.isPromo,
      highlight: !!p.highlight,
      isSpecial: (p.allowedModels?.length ?? 0) > 0,
      group: packageGroup(p.allowedModels ?? []),
      features: p.features,
    }));
  const groupKeys = ["general", ...MODEL_GROUPS.map((g) => g.key), "other"].filter((k) =>
    landingPackages.some((p) => p.group === k),
  );
  const packageGroups = groupKeys.map((key) => ({
    key,
    title:
      MODEL_GROUPS.find((g) => g.key === key)?.label ??
      (key === "general" ? (isEn ? "All models" : "Semua model") : isEn ? "Others" : "Lainnya"),
  }));
  const cheapest = landingPackages.find((p) => p.stock > 0) ?? landingPackages[0];

  const STEPS = isEn
    ? [
        { title: "Sign up free", desc: "Create an account in under a minute." },
        { title: "Pick a package & pay", desc: "Pay via QRIS or TOKS balance. Processed automatically." },
        { title: "Use your API key", desc: "Get a key instantly — works with any OpenAI-compatible app." },
      ]
    : [
        { title: "Daftar gratis", desc: "Buat akun kurang dari 1 menit." },
        { title: "Pilih paket & bayar", desc: "Bayar via QRIS atau saldo TOKS. Diproses otomatis." },
        { title: "Pakai API key", desc: "API key langsung jadi — bisa dipakai di aplikasi yang kompatibel OpenAI." },
      ];

  const INFRA_FEATURES = [
    { title: t("featureUnifiedTitle"), desc: t("featureUnifiedDesc"), icon: INFRA_ICONS[0] },
    { title: t("featureFastTitle"), desc: t("featureFastDesc"), icon: INFRA_ICONS[1] },
    { title: t("featureCompatTitle"), desc: t("featureCompatDesc"), icon: INFRA_ICONS[2] },
    { title: t("featureSecureTitle"), desc: t("featureSecureDesc"), icon: INFRA_ICONS[3] },
  ];

  const FAQS = isEn
    ? [
        { q: "What is a token package?", a: "A token package is a one-time purchase that gives you a fixed number of tokens (input + output) for a set active period. You get a dedicated API key right after payment — no subscription, no auto-renewal." },
        { q: "Token package or pay-as-you-go balance — which should I pick?", a: "Pick a token package if you want a fixed, cheaper price for a known amount of usage. Pick pay-as-you-go (top up TOKS balance) if your usage is irregular — you only pay for the tokens you actually use, and balance does not expire." },
        { q: "What is 9inference?", a: "9inference is an affordable AI model API gateway from Indonesia. One OpenAI-compatible endpoint gives you access to DeepSeek, GLM, Qwen, Kimi, MiniMax and more — transparent pricing in rupiah, no subscription." },
        { q: "Is 9inference compatible with the OpenAI SDK?", a: "Yes. Point your existing OpenAI client to the 9inference base URL, use your 9inference API key, and keep your code unchanged. It works with the official openai SDK, LangChain, and any OpenAI-compatible tool." },
        { q: "How do I pay?", a: "Via QRIS (all Indonesian e-wallets and mobile banking) or with your TOKS balance. 1 TOKS = Rp1,000. No credit card needed." },
        { q: "Which AI models are available?", a: "DeepSeek, GLM, Alibaba Qwen, Moonshot AI Kimi, MiniMax and more. Each package card shows which models it covers." },
      ]
    : [
        { q: "Apa itu paket token?", a: "Paket token adalah pembelian sekali bayar yang memberi Anda sejumlah token (input + output) dengan masa aktif tertentu. API key khusus langsung diberikan setelah pembayaran — tanpa langganan, tanpa perpanjangan otomatis." },
        { q: "Pilih paket token atau isi saldo (bayar per pemakaian)?", a: "Pilih paket token jika ingin harga lebih hemat untuk pemakaian yang sudah jelas jumlahnya. Pilih isi saldo TOKS jika pemakaian tidak menentu — Anda hanya membayar token yang benar-benar dipakai dan saldo tidak kedaluwarsa." },
        { q: "Apa itu 9inference?", a: "9inference adalah gateway API model AI murah dari Indonesia. Satu endpoint kompatibel OpenAI untuk mengakses DeepSeek, GLM, Qwen, Kimi, MiniMax & lainnya — harga transparan dalam rupiah, tanpa langganan." },
        { q: "Apakah 9inference kompatibel dengan OpenAI SDK?", a: "Ya. Cukup arahkan client OpenAI Anda ke base URL 9inference, pakai API key 9inference, dan kode tidak perlu diubah. Mendukung SDK openai resmi, LangChain, dan tool lain yang kompatibel OpenAI." },
        { q: "Bagaimana cara bayarnya?", a: "Lewat QRIS (semua e-wallet & mobile banking) atau memakai saldo TOKS. 1 TOKS = Rp1.000. Tidak perlu kartu kredit." },
        { q: "Model AI apa saja yang tersedia?", a: "DeepSeek, GLM, Alibaba Qwen, Moonshot AI Kimi, MiniMax, dan lainnya. Setiap kartu paket menampilkan model apa saja yang bisa dipakai." },
      ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const heroPoints = [
    ...(cheapest
      ? [
          <>
            {isEn ? "From " : "Mulai dari "}
            <span className="text-foreground">Rp{cheapest.price.toLocaleString(isEn ? "en-US" : "id-ID")}</span>
          </>,
        ]
      : []),
    isEn ? "Pay via QRIS" : "Bayar via QRIS",
    isEn ? "No subscription" : "Tanpa langganan",
    isEn ? "Instant API key" : "API key instan",
  ];

  return (
    <div className="landing-shell relative min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <LandingHeader isAuthed={isAuthed} />

      <main className="lp-frame pt-16">
        {/* ============================================================
            HERO
            ============================================================ */}
        <section className="landing-section">
          <div className="px-4 pb-8 pt-10 sm:px-8 sm:pb-12 sm:pt-16 lg:px-10">
            <p className="lp-eyebrow">
              {isEn ? `${modelCount} AI models · OpenAI-compatible` : `${modelCount} model AI · Kompatibel OpenAI`}
            </p>
            <h1 className="lp-display mt-6 max-w-5xl text-[3.1rem] sm:text-7xl lg:text-[6.5rem]">
              <AnimatedWords text={isEn ? "AI Token Packages," : "Paket Token AI,"} />{" "}
              <em>
                <AnimatedWords text={isEn ? "cheap & clear" : "murah & jelas"} start={3} />
              </em>
            </h1>
          </div>

          <div className="grid border-t lg:grid-cols-12">
            {/* Ilustrasi + kotak intro */}
            <div className="relative overflow-hidden border-b lg:col-span-8 lg:border-b-0 lg:border-r">
              <HeroIso className="absolute inset-0 h-full w-full" />
              <div className="relative z-10 flex min-h-[520px] flex-col justify-between gap-10 p-4 sm:min-h-[560px] sm:p-8 lg:p-10">
                <div className="max-w-md lp-outline bg-white p-5 sm:p-6">
                  <p className="text-[15px] leading-relaxed text-black sm:text-[17px]">
                    {isEn
                      ? "Pick a package, pay once, and get an API key instantly. One key for DeepSeek, GLM, Qwen, Kimi and more."
                      : "Pilih paket, bayar sekali, API key langsung jadi. Satu key untuk DeepSeek, GLM, Qwen, Kimi, dan lainnya."}
                  </p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    <a href="#paket-list" className="lp-btn h-11 justify-between px-4 text-[14px]">
                      {isEn ? "See token packages" : "Lihat paket token"}
                      <span aria-hidden className="lp-caret" />
                    </a>
                    {isAuthed ? (
                      <Link href="/dashboard/beli-paket" className="lp-btn-ghost h-11 justify-between px-4 text-[14px]">
                        {isEn ? "Buy a package" : "Beli paket sekarang"}
                        <span aria-hidden className="lp-caret" />
                      </Link>
                    ) : (
                      <Link href="/register" className="lp-btn-ghost h-11 justify-between px-4 text-[14px]">
                        {t("registerFree")}
                        <span aria-hidden className="lp-caret" />
                      </Link>
                    )}
                  </div>
                </div>

                <ul className="flex flex-wrap gap-2">
                  {heroPoints.map((point, i) => (
                    <li
                      key={i}
                      className="lp-mono inline-flex items-center gap-2 border border-[var(--lp-line)] bg-white px-2.5 py-1.5 text-[11px] uppercase tracking-[0.04em] text-muted-foreground"
                    >
                      <span aria-hidden className="h-1.5 w-1.5 bg-[var(--lp-green)]" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Ubin provider */}
            <div className="flex flex-col lg:col-span-4">
              <div className="border-b px-4 py-3 sm:px-6">
                <span className="lp-label">{t("providersLabel")}</span>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-px bg-[var(--lp-line)]">
                {PROVIDERS.map((p, i) => {
                  const group = brandGroupOf(p);
                  return (
                    <div
                      key={p}
                      className="lp-tile lp-scan min-h-24 px-3 text-[15px] tracking-tight sm:min-h-28 sm:text-[17px]"
                      style={{ animationDelay: `${i * 1.8}s` }}
                    >
                      {group && <PackageBrandIcon group={group} className="h-5 w-5 shrink-0 brightness-0" />}
                      <span className="truncate">{p}</span>
                    </div>
                  );
                })}
                <Link
                  href="/models"
                  className="lp-tile min-h-24 flex-col !gap-1 bg-black px-3 text-white hover:!bg-[var(--lp-green)] hover:text-black sm:min-h-28"
                >
                  <span className="lp-display text-3xl">{modelCount}+</span>
                  <span className="lp-mono text-[10px] uppercase tracking-[0.06em]">{tf("aiModels")}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            PERNYATAAN
            ============================================================ */}
        <section className="landing-section lp-rule px-4 py-20 sm:px-8 sm:py-28 lg:px-10">
          <p className="lp-reveal lp-display mx-auto max-w-4xl text-center text-[1.75rem] !leading-[1.15] !tracking-[-0.02em] sm:text-[2.5rem]">
            {t("subheadline")}
          </p>
        </section>

        {/* ============================================================
            HARGA PAKET TOKEN (fokus utama)
            ============================================================ */}
        <section id="paket" className="landing-section lp-rule scroll-mt-16 px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <SectionHead
            eyebrow={isEn ? "Token packages" : "Paket token"}
            title={isEn ? "Pay once. Get your key." : "Bayar sekali. Key langsung jadi."}
            desc={
              isEn
                ? "No subscription, no auto-renewal. Every package comes with a dedicated API key."
                : "Tanpa langganan, tanpa perpanjangan otomatis. Setiap paket dapat API key khusus."
            }
          />

          <div id="paket-list" className="lp-reveal mt-10 scroll-mt-24 sm:mt-12">
            <PackagePricing packages={landingPackages} groups={packageGroups} isEn={isEn} />
          </div>

          <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
            {isEn ? "Token quota counts input + output. " : "Kuota token dihitung input + output. "}
            {isEn ? "Prefer to pay only for what you use? " : "Mau bayar sesuai pemakaian saja? "}
            <a href="#payg" className="text-black underline underline-offset-4 hover:bg-[var(--lp-green-soft)]">
              {isEn ? "See pay-as-you-go rates" : "Lihat tarif per model"}
            </a>
          </p>
        </section>

        {/* ============================================================
            CARA BELI — 3 langkah
            ============================================================ */}
        <section className="landing-section lp-rule px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHead
              eyebrow={isEn ? "How it works" : "Cara beli"}
              title={isEn ? "Three steps to your API key" : "Tiga langkah, API key siap"}
            />
            <Link
              href={isAuthed ? "/dashboard/beli-paket" : "/register"}
              className="lp-btn h-12 w-full justify-between px-5 text-sm sm:w-auto sm:min-w-56"
            >
              {isAuthed ? (isEn ? "Buy a package" : "Beli paket sekarang") : isEn ? "Sign up free" : "Daftar gratis"}
              <span aria-hidden className="lp-caret" />
            </Link>
          </div>
          <ol className="lp-cells lp-reveal mt-10 grid sm:mt-12 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="lp-cell relative bg-white p-6 sm:p-8">
                <span className="lp-mono text-[11px] text-muted-foreground">STEP</span>
                <div className="lp-display mt-2 text-6xl">0{i + 1}</div>
                <h3 className="mt-10 text-[17px] tracking-tight text-foreground">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <span aria-hidden className="absolute right-6 top-8 hidden h-2.5 w-2.5 bg-[var(--lp-green)] sm:block" />
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ============================================================
            TARIF PER MODEL (bayar per pemakaian)
            ============================================================ */}
        <section id="payg" className="landing-section lp-rule scroll-mt-20 px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHead
              eyebrow={isEn ? "Alternative: pay as you go" : "Alternatif: bayar per pemakaian"}
              title={isEn ? "Per-model rates" : "Tarif per model"}
              desc={
                isEn
                  ? "Top up TOKS balance and pay only for tokens used. Balance never expires."
                  : "Isi saldo TOKS, bayar hanya token yang dipakai. Saldo tidak kedaluwarsa."
              }
            />
            <p className="lp-mono inline-flex shrink-0 items-center gap-2 self-start bg-[var(--lp-green-soft)] px-3 py-2 text-[12px] text-black sm:self-auto">
              1 TOKS <span aria-hidden>=</span> Rp1.000
            </p>
          </div>

          <div className="lp-reveal mt-10 sm:mt-12">
            <PremiumPricingTable models={models} t={t} tc={tc} isEn={isEn} />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href={isAuthed ? "/dashboard/wallet" : "/register"} className="lp-btn h-12 justify-between px-5 text-sm sm:min-w-52">
              {isEn ? "Top up balance" : "Isi saldo TOKS"}
              <span aria-hidden className="lp-caret" />
            </Link>
            <Link href="/models" className="lp-btn-ghost h-12 px-5 text-sm">
              {t("viewAllModelsArrow")}
            </Link>
          </div>
        </section>

        {/* ============================================================
            KEUNGGULAN PLATFORM
            ============================================================ */}
        <section id="platform" className="landing-section lp-rule scroll-mt-20 pt-16 sm:pt-24">
          <div className="px-4 sm:px-8 lg:px-10">
            <SectionHead eyebrow={t("infraEyebrow")} title={t("infraTitle")} desc={t("infraDesc")} />
          </div>
          <div className="mt-10 sm:mt-12">
            <FeatureTabs items={INFRA_FEATURES} label={t("infraEyebrow")} />
          </div>
        </section>

        {/* ============================================================
            DEVELOPER EXPERIENCE
            ============================================================ */}
        <section className="landing-section px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <SectionHead
            eyebrow={t("dxEyebrow")}
            title={t("dxTitle")}
            desc={
              isEn
                ? "Already using the OpenAI SDK? Just point your client to our base URL — done."
                : "Sudah pakai OpenAI SDK? Cukup arahkan client ke base URL kami — selesai."
            }
          />
          <div className="lp-reveal mt-10 min-w-0 sm:mt-12">
            <CodeTabs />
          </div>
        </section>

        {/* ============================================================
            FAQ
            ============================================================ */}
        <section className="landing-section lp-rule px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionHead
                eyebrow={isEn ? "Frequently Asked Questions" : "Pertanyaan Umum"}
                title={isEn ? "Still unsure? Read this" : "Masih bingung? Baca ini"}
              />
            </div>
            <div className="lp-reveal border-t lg:col-span-8">
              {FAQS.map((f) => (
                <details key={f.q} className="lp-faq group border-b">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] text-foreground">
                    {f.q}
                    <span className="lp-faq-icon inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--lp-line)] transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-45" aria-hidden>
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-6 pr-12 text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================
            FINAL CTA + angka
            ============================================================ */}
        <section className="landing-section lp-rule overflow-hidden pt-20 sm:pt-28">
          <div className="px-4 text-center sm:px-8">
            <p className="lp-eyebrow">{isEn ? "Get started" : "Mulai sekarang"}</p>
            <h2 className="lp-display mx-auto mt-6 max-w-5xl text-[2.75rem] sm:text-7xl">
              {isEn ? (
                <>Start saving on AI <em>today</em></>
              ) : (
                <>Hemat biaya AI <em>mulai hari ini</em></>
              )}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              {isEn
                ? "Pick a token package, pay via QRIS, and your API key is ready in seconds."
                : "Pilih paket token, bayar via QRIS, API key siap dalam hitungan detik."}
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <a href="#paket" className="lp-btn h-12 justify-between px-5 text-sm sm:min-w-52">
                {isEn ? "See token packages" : "Lihat paket token"}
                <span aria-hidden className="lp-caret" />
              </a>
              {!isAuthed && (
                <Link href="/register" className="lp-btn-ghost h-12 justify-between px-5 text-sm sm:min-w-44">
                  {t("registerFree")}
                  <span aria-hidden className="lp-caret" />
                </Link>
              )}
            </div>
          </div>

          <SlabStrip />

          <dl className="grid grid-cols-1 border-t sm:grid-cols-3">
            {[
              { value: modelCount, prefix: "", label: tf("aiModels") },
              ...(cheapest
                ? [{ value: cheapest.price, prefix: "Rp", label: isEn ? "Packages from" : "Paket mulai dari" }]
                : []),
              { value: 1000, prefix: "Rp", label: "= 1 TOKS" },
            ].map((s, i) => (
              <div key={s.label} className={`flex flex-col-reverse px-4 py-8 sm:px-8 sm:py-10 ${i > 0 ? "border-t sm:border-l sm:border-t-0" : ""}`}>
                <dt className="lp-label mt-3">{s.label}</dt>
                <dd className="lp-display text-5xl sm:text-6xl">
                  <CountUp value={s.value} prefix={s.prefix} locale={isEn ? "en-US" : "id-ID"} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="lp-invert landing-section px-4 pb-24 pt-14 sm:px-8 sm:pb-10 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" aria-label="9inference" className="text-white">
                <BrandLogo />
              </Link>
              <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-[var(--muted-foreground)]">{tf("tagline")}</p>
              <Link href="/status" className="mt-6 inline-flex items-center gap-2 text-[13px] text-white hover:text-[var(--lp-green)]">
                <span aria-hidden className="lp-live h-2 w-2 bg-[var(--lp-green)]" />
                {tf("status")}
              </Link>
            </div>

            <FooterCol
              title={t("providersLabel")}
              links={[
                { label: tf("aiModels"), href: "/models" },
                { label: tf("tokenPricing"), href: "/pricing" },
                { label: tc("blog"), href: "/blog" },
                { label: tf("status"), href: "/status" },
                { label: tc("dashboard"), href: "/dashboard" },
              ]}
            />
            <FooterCol
              title={tf("account")}
              links={[
                { label: tc("login"), href: "/login" },
                { label: tc("register"), href: "/register" },
                { label: tc("topUp"), href: "/dashboard/wallet" },
                { label: tf("terms"), href: "/terms" },
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
          </div>

          <Link
            href="/"
            aria-label="9inference"
            className="lp-display mt-16 flex select-none items-center gap-[0.12em] text-[18vw] leading-[0.8] !tracking-[-0.06em] text-white transition-colors hover:text-[var(--lp-green)] sm:mt-20 lg:text-[16rem]"
          >
            <BrandMark className="h-[0.62em] w-auto shrink-0" />
            9inference
          </Link>

          <div className="mt-8 flex flex-col gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="lp-mono text-[11px] uppercase tracking-[0.04em] text-[var(--muted-foreground)]">
              {isEn ? "No subscription. No hidden fees." : "Tanpa langganan. Tanpa biaya tersembunyi."}
            </p>
            <p className="lp-mono text-[11px] uppercase tracking-[0.04em] text-[var(--muted-foreground)]">
              {tf("copyright", { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>

      {/* Tombol lengket di HP — muncul setelah melewati daftar paket */}
      <MobilePackageCta
        label={
          cheapest
            ? isEn
              ? `See packages · from Rp${cheapest.price.toLocaleString("en-US")}`
              : `Lihat paket · mulai Rp${cheapest.price.toLocaleString("id-ID")}`
            : isEn
              ? "See token packages"
              : "Lihat paket token"
        }
      />
    </div>
  );
}

/* ===== Helpers ===== */

/** Teks yang muncul kata demi kata saat halaman dibuka. */
function AnimatedWords({ text, start = 0 }: { text: string; start?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="lp-word" style={{ animationDelay: `${0.08 + (start + i) * 0.09}s` }}>
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

function SectionHead({
  eyebrow,
  title,
  desc,
  center = false,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  center?: boolean;
}) {
  return (
    <div className={`lp-reveal ${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}`}>
      <p className="lp-eyebrow">{eyebrow}</p>
      <h2 className="lp-display mt-5 text-[2.4rem] sm:text-[3.5rem]">{title}</h2>
      {desc && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">{desc}</p>}
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="lp-mono bg-white px-2.5 py-1.5 text-[11px] uppercase tracking-[0.04em] text-black">{title}</div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block text-[14px] text-white transition hover:text-[var(--lp-green)]">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Deretan lempengan isometrik, memudar dari hijau pucat ke hitam. */
function SlabStrip() {
  const n = 14;
  const slabs = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const x = 40 + i * 92;
    const lift = Math.sin(t * Math.PI * 1.3) * 26;
    const dark = t > 0.78;
    const top = dark ? "#ffffff" : `rgba(199,226,192,${0.35 + t * 0.6})`;
    const side = dark ? "#000000" : `rgba(150,190,140,${0.25 + t * 0.6})`;
    const y = 70 - lift;
    return (
      <g key={i} className="lp-wave" style={{ animationDelay: `${(i * 0.16).toFixed(2)}s` }}>
        <polygon points={`${x},${y + 40} ${x + 60},${y} ${x + 80},${y + 12} ${x + 20},${y + 52}`} fill={top} stroke={dark ? "#000" : "none"} strokeWidth="1" />
        <polygon points={`${x + 20},${y + 52} ${x + 80},${y + 12} ${x + 80},${y + 26} ${x + 20},${y + 66}`} fill={side} />
      </g>
    );
  });
  return (
    <div className="mt-16 overflow-hidden sm:mt-20" aria-hidden>
      <svg viewBox="0 0 1320 150" className="h-auto w-full min-w-[720px]" preserveAspectRatio="xMidYMid meet">
        {slabs}
      </svg>
    </div>
  );
}

/** Status model: kotak hijau = aktif, kotak kosong = pemeliharaan. */
function ModelStatus({ maintenance, tc }: { maintenance: boolean; tc: (key: string) => string }) {
  return (
    <span className={`lp-mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.04em] ${maintenance ? "text-muted-foreground" : "text-foreground"}`}>
      <span
        aria-hidden
        className={`h-2 w-2 ${maintenance ? "border border-[var(--lp-sage)]" : "bg-[var(--lp-green)]"}`}
      />
      {maintenance ? tc("maintenance") : tc("active")}
    </span>
  );
}

function PremiumPricingTable({
  models,
  t,
  tc,
  isEn,
}: {
  models: ModelCardData[];
  t: (key: string) => string;
  tc: (key: string) => string;
  isEn: boolean;
}) {
  if (models.length === 0) {
    return (
      <div className="border p-10 text-center text-sm text-muted-foreground">
        {isEn ? "Prices are being updated." : "Harga sedang diperbarui."}
      </div>
    );
  }
  const nf = (n: number) => n.toLocaleString(isEn ? "en-US" : "id-ID");
  const toks = (n: number) => (n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const perM = isEn ? "/ 1M tokens" : "/ 1 juta token";
  const th = "lp-mono px-5 py-3 text-[11px] font-normal uppercase tracking-[0.04em] text-black";

  return (
    <div className="border">
      {/* HP: daftar ringkas, tanpa scroll horizontal */}
      <ul className="md:hidden">
        {models.map((m) => (
          <li key={m.id} className="border-b px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/models/${encodeURIComponent(m.modelId)}`}
                  className="block truncate text-[15px] text-foreground"
                >
                  {m.name}
                </Link>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {m.provider}
                  {m.contextWindow ? <span> · {m.contextWindow}</span> : null}
                </div>
              </div>
              {m.maintenanceMode && <ModelStatus maintenance tc={tc} />}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <dt className="lp-label">Input</dt>
                <dd className="mt-1 font-mono text-foreground">Rp{nf(m.inputPricePerMillion)}</dd>
              </div>
              <div>
                <dt className="lp-label">Output</dt>
                <dd className="mt-1 font-mono text-foreground">Rp{nf(m.outputPricePerMillion)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop/tablet: tabel */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[var(--lp-pale)] text-left">
              <th className={th}>Model</th>
              <th className={th}>Provider</th>
              <th className={th}>{isEn ? "Context" : "Konteks"}</th>
              <th className={`${th} text-right`}>Input {perM}</th>
              <th className={`${th} text-right`}>Output {perM}</th>
              <th className={`${th} text-right`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="border-b transition-colors hover:bg-[var(--lp-pale)]">
                <td className="px-5 py-4">
                  <Link
                    href={`/models/${encodeURIComponent(m.modelId)}`}
                    className="text-[15px] text-foreground underline-offset-4 hover:underline"
                  >
                    {m.name}
                  </Link>
                  <code className="mt-0.5 block text-[11px] text-muted-foreground">{m.modelId}</code>
                </td>
                <td className="px-5 py-4 text-[13px] text-muted-foreground">{m.provider}</td>
                <td className="px-5 py-4 font-mono text-[12px] text-muted-foreground">{m.contextWindow || "—"}</td>
                <td className="px-5 py-4 text-right">
                  <div className="font-mono text-foreground">Rp{nf(m.inputPricePerMillion)}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{toks(m.inputPricePerMillion)} TOKS</div>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="font-mono text-foreground">Rp{nf(m.outputPricePerMillion)}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{toks(m.outputPricePerMillion)} TOKS</div>
                </td>
                <td className="px-5 py-4 text-right">
                  <ModelStatus maintenance={m.maintenanceMode} tc={tc} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-[var(--lp-pale)] px-4 py-3.5 text-[12px] leading-relaxed text-muted-foreground sm:px-5">
        {t("pricingTableNote")}
      </div>
    </div>
  );
}
