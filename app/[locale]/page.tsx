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

/** Sama dengan pengelompokan di halaman Beli Paket (dashboard). */
const MODEL_GROUPS = [
  { key: "glm", label: "GLM" },
  { key: "kimi", label: "Kimi" },
  { key: "deepseek", label: "DeepSeek" },
  { key: "gemini", label: "Gemini" },
  { key: "qwen", label: "Qwen" },
  { key: "claude", label: "Claude" },
] as const;

function packageGroup(allowedModels: string[]): string {
  if (allowedModels.length === 0) return "general";
  return (
    MODEL_GROUPS.find(({ key }) => allowedModels.every((m) => m.toLowerCase().includes(key)))?.key ?? "other"
  );
}

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

  const capLabels = {
    coding: t("capCoding"),
    fast: t("capFast"),
    reasoning: t("capReasoning"),
    vision: t("capVision"),
    general: t("capGeneral"),
  };

  /* ---------- Paket token (fokus utama landing page) ---------- */
  // Urutan: yang masih ada stok dulu, lalu dari harga termurah.
  const landingPackages: LandingPackage[] = [...allPackages]
    .sort((a, b) => Number(a.stock <= 0) - Number(b.stock <= 0) || a.price - b.price)
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

  const checkIcon = (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="landing-shell relative min-h-screen overflow-x-hidden bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <LandingHeader isAuthed={isAuthed} />

      {/* ============================================================
          HERO + HARGA PAKET TOKEN (tampilan utama)
          ============================================================ */}
      <section id="paket" className="landing-section relative scroll-mt-16 px-4 pb-14 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 40% at 50% 0%, rgba(184,255,69,0.10) 0%, transparent 70%)",
          }}
          aria-hidden
        />

        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.06] px-3 py-1.5 text-[11px] font-semibold text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {isEn ? `${modelCount} AI models · OpenAI-compatible` : `${modelCount} model AI · Kompatibel OpenAI`}
            </div>

            <h1 className="landing-display mt-5 text-[2.1rem] font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              {isEn ? (
                <>AI Token Packages, <span className="gradient-text-accent">cheap &amp; clear</span></>
              ) : (
                <>Paket Token AI <span className="gradient-text-accent">murah &amp; jelas</span></>
              )}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
              {isEn
                ? "Pick a package, pay once, and get an API key instantly. One key for DeepSeek, GLM, Qwen, Kimi and more."
                : "Pilih paket, bayar sekali, API key langsung jadi. Satu key untuk DeepSeek, GLM, Qwen, Kimi, dan lainnya."}
            </p>
            {cheapest && (
              <p className="mt-3 text-[13px] text-foreground/90">
                {isEn ? "Starting from " : "Mulai dari "}
                <strong className="text-accent">Rp{cheapest.price.toLocaleString(isEn ? "en-US" : "id-ID")}</strong>
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">{checkIcon}{isEn ? "Pay via QRIS" : "Bayar via QRIS"}</span>
              <span className="flex items-center gap-1.5">{checkIcon}{isEn ? "No subscription" : "Tanpa langganan"}</span>
              <span className="flex items-center gap-1.5">{checkIcon}{isEn ? "Instant API key" : "API key instan"}</span>
            </div>
          </div>

          <div id="paket-list" className="mt-8 sm:mt-10">
            <PackagePricing packages={landingPackages} groups={packageGroups} isEn={isEn} />
          </div>

          <p className="mt-6 text-center text-[12px] leading-relaxed text-muted-foreground">
            {isEn ? "Token quota counts input + output. " : "Kuota token dihitung input + output. "}
            {isEn ? "Prefer to pay only for what you use? " : "Mau bayar sesuai pemakaian saja? "}
            <a href="#payg" className="font-medium text-accent underline underline-offset-2">
              {isEn ? "See pay-as-you-go rates" : "Lihat tarif per model"}
            </a>
          </p>
        </div>
      </section>

      {/* ============================================================
          CARA BELI — 3 langkah
          ============================================================ */}
      <section className="landing-section px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="landing-display text-center text-2xl font-semibold sm:text-4xl">
            {isEn ? "How it works" : "Cara beli, 3 langkah"}
          </h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="glass flex gap-4 rounded-2xl p-4 sm:flex-col sm:p-6">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-black">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={isAuthed ? "/dashboard/beli-paket" : "/register"}
              className="btn-accent inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-7 text-sm"
            >
              {isAuthed ? (isEn ? "Buy a package" : "Beli paket sekarang") : isEn ? "Sign up free" : "Daftar gratis"}
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          LOGO STRIP / PROVIDERS
          ============================================================ */}
      <section className="landing-section border-y border-white/[0.05] bg-[#b8ff45] py-5 text-[#101208]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
              {t("providersLabel")}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {["GLM", "DeepSeek", "Alibaba Qwen", "Moonshot AI", "MiniMax"].map((p) => (
                <span key={p} className="text-sm font-bold tracking-tight text-black/70">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TARIF PER MODEL (bayar per pemakaian)
          ============================================================ */}
      <section id="payg" className="landing-section scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {isEn ? "Alternative: pay as you go" : "Alternatif: bayar per pemakaian"}
            </span>
            <h2 className="landing-display mt-3 text-2xl font-semibold sm:text-4xl">
              {isEn ? "Per-model rates" : "Tarif per model"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              {isEn
                ? "Top up TOKS balance and pay only for tokens used. Balance never expires."
                : "Isi saldo TOKS, bayar hanya token yang dipakai. Saldo tidak kedaluwarsa."}
            </p>
            <div className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[12px]">
              <span className="font-semibold text-accent">1 TOKS</span>
              <span className="text-muted-foreground">=</span>
              <span className="font-semibold text-foreground">Rp1.000</span>
            </div>
          </div>

          <div className="mt-8">
            <PremiumPricingTable models={models} t={t} tc={tc} isEn={isEn} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={isAuthed ? "/dashboard/wallet" : "/register"}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-6 text-sm font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/[0.05]"
            >
              {isEn ? "Top up balance" : "Isi saldo TOKS"}
            </Link>
            <Link
              href="/models"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-transparent px-6 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {t("viewAllModelsArrow")}
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          KEUNGGULAN PLATFORM
          ============================================================ */}
      <section id="platform" className="landing-section scroll-mt-20 bg-white/[0.018] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("infraEyebrow")}
            </span>
            <h2 className="landing-display mt-3 text-2xl font-semibold sm:text-4xl">
              {t("infraTitle")}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t("infraDesc")}</p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {INFRA_FEATURES.map((f) => (
              <div key={f.title} className="glass flex gap-4 rounded-2xl p-4 sm:flex-col sm:p-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-accent">
                  {f.icon}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          MODEL SHOWCASE
          ============================================================ */}
      <section id="models" className="landing-section scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                {t("catalogEyebrow")}
              </span>
              <h2 className="landing-display mt-3 text-2xl font-semibold sm:text-4xl">
                {t("catalogTitle")}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {t("catalogDesc", { count: modelCount })}
              </p>
            </div>
            <Link
              href="/models"
              className="inline-flex min-h-10 items-center justify-center self-start rounded-lg border border-white/10 bg-white/[0.02] px-4 text-[13px] font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05] sm:self-auto"
            >
              {t("viewAllModelsArrow")}
            </Link>
          </div>

          {models.length === 0 ? (
            <div className="glass mt-8 rounded-2xl p-10 text-center text-sm text-muted-foreground">
              {t("catalogEmpty")}
            </div>
          ) : (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {models.slice(0, 6).map((m) => (
                <ModelShowcaseCard key={m.id} model={m} capLabels={capLabels} isEn={isEn} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          DEVELOPER EXPERIENCE
          ============================================================ */}
      <section className="landing-section bg-white/[0.018] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {t("dxEyebrow")}
            </span>
            <h2 className="landing-display mt-3 text-2xl font-semibold sm:text-4xl">{t("dxTitle")}</h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {isEn
                ? "Already using the OpenAI SDK? Just point your client to our base URL — done."
                : "Sudah pakai OpenAI SDK? Cukup arahkan client ke base URL kami — selesai."}
            </p>
          </div>
          <div className="mt-8 min-w-0">
            <CodeTabs />
          </div>
        </div>
      </section>

      {/* ============================================================
          FAQ
          ============================================================ */}
      <section className="landing-section px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {isEn ? "Frequently Asked Questions" : "Pertanyaan Umum"}
            </span>
            <h2 className="landing-display mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">
              {isEn ? "Still unsure? Read this" : "Masih bingung? Baca ini"}
            </h2>
          </div>

          <div className="mt-8 space-y-2.5">
            {FAQS.map((f) => (
              <details key={f.q} className="group glass overflow-hidden rounded-xl transition open:border-white/[0.14]">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-semibold text-foreground transition hover:text-accent sm:px-5 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden>
                    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="px-4 pb-4 text-[13px] leading-relaxed text-muted-foreground sm:px-5">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
          ============================================================ */}
      <section className="landing-section px-4 pb-24 pt-6 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="glass relative overflow-hidden rounded-2xl border-accent/20 p-6 text-center sm:p-14">
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              style={{ background: "radial-gradient(60% 70% at 50% 0%, rgba(184,255,69,0.10), transparent 70%)" }}
              aria-hidden
            />
            <h2 className="landing-display text-2xl font-semibold sm:text-4xl">
              {isEn ? "Start saving on AI today" : "Hemat biaya AI mulai hari ini"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              {isEn
                ? "Pick a token package, pay via QRIS, and your API key is ready in seconds."
                : "Pilih paket token, bayar via QRIS, API key siap dalam hitungan detik."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a href="#paket" className="btn-accent inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-7 text-sm">
                {isEn ? "See token packages" : "Lihat paket token"}
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M12 19V5m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              {!isAuthed && (
                <Link
                  href="/register"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-7 text-sm font-medium text-foreground transition hover:border-white/25"
                >
                  {t("registerFree")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="border-t border-white/[0.06] px-4 pb-24 pt-10 sm:px-6 sm:pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <div className="col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-[11px] font-bold text-background">
                  9i
                </span>
                <span className="text-[15px] font-semibold tracking-tight">9inference</span>
              </Link>
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted-foreground">{tf("tagline")}</p>
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
            <div className="col-span-2 lg:col-span-1">
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
          </div>

          <div className="mt-10 border-t border-white/[0.06] pt-6 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
            <p className="text-[12px] text-muted-foreground">{tf("copyright", { year: new Date().getFullYear() })}</p>
            <p className="mt-2 text-[12px] text-muted-foreground sm:mt-0">
              {isEn ? "No subscription. No hidden fees." : "Tanpa langganan. Tanpa biaya tersembunyi."}
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

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block py-0.5 text-[13px] text-muted-foreground transition hover:text-foreground">
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
  isEn,
}: {
  model: ModelCardData;
  capLabels: { coding: string; fast: string; reasoning: string; vision: string; general: string };
  isEn: boolean;
}) {
  const cap = capabilityLabel(model.name, model.modelId, capLabels);
  const dot = PROVIDER_DOT[model.provider] ?? "bg-white/40";
  const isLive = !model.maintenanceMode;

  return (
    <div className="glass group relative flex flex-col rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground">{model.name}</h3>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            <span className="text-[12px] text-muted-foreground">{model.provider}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
            isLive ? "border-accent/25 bg-accent/10 text-accent" : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          }`}
        >
          {isLive ? (isEn ? "Active" : "Aktif") : isEn ? "Maintenance" : "Pemeliharaan"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[12px]">
        <div>
          <div className="text-[10px] text-muted-foreground">{isEn ? "Context" : "Konteks"}</div>
          <div className="mt-0.5 font-semibold text-foreground">{model.contextWindow ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">{isEn ? "Strength" : "Kemampuan"}</div>
          <div className="mt-0.5 font-semibold text-foreground">{cap}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-1.5 font-mono text-[11px] text-foreground/80">
          {model.modelId}
        </code>
        <Link
          href={`/models/${encodeURIComponent(model.modelId)}`}
          className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:border-white/20"
        >
          {isEn ? "Details" : "Detail"}
        </Link>
      </div>
    </div>
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
      <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
        {isEn ? "Prices are being updated." : "Harga sedang diperbarui."}
      </div>
    );
  }
  const nf = (n: number) => n.toLocaleString(isEn ? "en-US" : "id-ID");
  const perM = isEn ? "/ 1M tokens" : "/ 1 juta token";

  return (
    <div className="glass overflow-hidden rounded-2xl">
      {/* HP: daftar kartu ringkas, tanpa scroll horizontal */}
      <ul className="divide-y divide-white/[0.06] md:hidden">
        {models.map((m) => (
          <li key={m.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{m.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${PROVIDER_DOT[m.provider] ?? "bg-white/40"}`} />
                  {m.provider}
                  {m.contextWindow ? <span>· {m.contextWindow}</span> : null}
                </div>
              </div>
              {m.maintenanceMode && (
                <span className="shrink-0 text-[11px] font-medium text-amber-400">{tc("maintenance")}</span>
              )}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Input</div>
                <div className="font-mono text-[13px] font-semibold text-foreground">Rp{nf(m.inputPricePerMillion)}</div>
                <div className="text-[10px] text-muted-foreground">{perM}</div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Output</div>
                <div className="font-mono text-[13px] font-semibold text-foreground">Rp{nf(m.outputPricePerMillion)}</div>
                <div className="text-[10px] text-muted-foreground">{perM}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop/tablet: tabel */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-left">
              <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Model</th>
              <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Provider</th>
              <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{isEn ? "Context" : "Konteks"}</th>
              <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Input {perM}</th>
              <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Output {perM}</th>
              <th className="px-5 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
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
                  <div className="font-mono font-semibold text-foreground">Rp{nf(m.inputPricePerMillion)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(m.inputPricePerMillion / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} TOKS
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="font-mono font-semibold text-foreground">Rp{nf(m.outputPricePerMillion)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(m.outputPricePerMillion / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} TOKS
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
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {tc("active")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/[0.08] px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
        {t("pricingTableNote")}
      </div>
    </div>
  );
}
