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
    <div className="landing-shell relative min-h-screen overflow-x-hidden bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <LandingHeader isAuthed={isAuthed} />

      {/* ============================================================
          HERO + HARGA PAKET TOKEN (tampilan utama)
          ============================================================ */}
      <section id="paket" className="landing-section relative scroll-mt-16 px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-40">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 32% at 50% 0%, rgba(255,255,255,0.07) 0%, transparent 70%)",
          }}
          aria-hidden
        />

        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="lp-eyebrow">
              {isEn ? `${modelCount} AI models · OpenAI-compatible` : `${modelCount} model AI · Kompatibel OpenAI`}
            </p>

            <h1 className="lp-display mt-6 text-[2.75rem] sm:text-6xl lg:text-7xl">
              {isEn ? (
                <>AI Token Packages,<br /><em>cheap &amp; clear</em></>
              ) : (
                <>Paket Token AI,<br /><em>murah &amp; jelas</em></>
              )}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
              {isEn
                ? "Pick a package, pay once, and get an API key instantly. One key for DeepSeek, GLM, Qwen, Kimi and more."
                : "Pilih paket, bayar sekali, API key langsung jadi. Satu key untuk DeepSeek, GLM, Qwen, Kimi, dan lainnya."}
            </p>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground sm:gap-x-3">
              {heroPoints.map((point, i) => (
                <li key={i} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden className="hidden h-3 w-px bg-white/20 sm:block" />}
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div id="paket-list" className="mt-12 sm:mt-16">
            <PackagePricing packages={landingPackages} groups={packageGroups} isEn={isEn} />
          </div>

          <p className="mt-8 text-center text-[12px] leading-relaxed text-muted-foreground">
            {isEn ? "Token quota counts input + output. " : "Kuota token dihitung input + output. "}
            {isEn ? "Prefer to pay only for what you use? " : "Mau bayar sesuai pemakaian saja? "}
            <a href="#payg" className="text-foreground underline underline-offset-4">
              {isEn ? "See pay-as-you-go rates" : "Lihat tarif per model"}
            </a>
          </p>
        </div>
      </section>

      {/* ============================================================
          PROVIDERS
          ============================================================ */}
      <section className="landing-section px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="lp-eyebrow">{t("providersLabel")}</span>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {PROVIDERS.map((p) => (
              <span key={p} className="lp-display text-xl italic text-foreground/80">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CARA BELI — 3 langkah
          ============================================================ */}
      <section className="landing-section px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow={isEn ? "How it works" : "Cara beli"}
            title={isEn ? "Three steps to your API key" : "Tiga langkah, API key siap"}
          />
          <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-[var(--color-border)] sm:mt-12 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="bg-background p-6 sm:p-8">
                <span className="lp-display text-4xl text-muted-foreground">0{i + 1}</span>
                <h3 className="mt-6 text-[15px] font-medium text-foreground">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <Link
              href={isAuthed ? "/dashboard/beli-paket" : "/register"}
              className="lp-btn min-h-12 w-full px-7 text-sm sm:w-auto"
            >
              {isAuthed ? (isEn ? "Buy a package" : "Beli paket sekarang") : isEn ? "Sign up free" : "Daftar gratis"}
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          TARIF PER MODEL (bayar per pemakaian)
          ============================================================ */}
      <section id="payg" className="landing-section scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
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
            <p className="shrink-0 text-[13px] text-muted-foreground">
              1 TOKS <span aria-hidden>=</span> <span className="text-foreground">Rp1.000</span>
            </p>
          </div>

          <div className="mt-10 sm:mt-12">
            <PremiumPricingTable models={models} t={t} tc={tc} isEn={isEn} />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={isAuthed ? "/dashboard/wallet" : "/register"} className="lp-btn-ghost min-h-12 px-7 text-sm">
              {isEn ? "Top up balance" : "Isi saldo TOKS"}
            </Link>
            <Link
              href="/models"
              className="inline-flex min-h-12 items-center justify-center px-4 text-sm text-muted-foreground transition hover:text-foreground"
            >
              {t("viewAllModelsArrow")}
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          KEUNGGULAN PLATFORM
          ============================================================ */}
      <section id="platform" className="landing-section scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow={t("infraEyebrow")} title={t("infraTitle")} desc={t("infraDesc")} />

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-[var(--color-border)] sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {INFRA_FEATURES.map((f) => (
              <div key={f.title} className="bg-background p-6 sm:p-8">
                <span className="text-foreground">{f.icon}</span>
                <h3 className="mt-6 text-[15px] font-medium tracking-tight text-foreground">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          DEVELOPER EXPERIENCE
          ============================================================ */}
      <section className="landing-section px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow={t("dxEyebrow")}
            title={t("dxTitle")}
            desc={
              isEn
                ? "Already using the OpenAI SDK? Just point your client to our base URL — done."
                : "Sudah pakai OpenAI SDK? Cukup arahkan client ke base URL kami — selesai."
            }
          />
          <div className="mt-10 min-w-0 sm:mt-12">
            <CodeTabs />
          </div>
        </div>
      </section>

      {/* ============================================================
          FAQ
          ============================================================ */}
      <section className="landing-section px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <SectionHead
            center
            eyebrow={isEn ? "Frequently Asked Questions" : "Pertanyaan Umum"}
            title={isEn ? "Still unsure? Read this" : "Masih bingung? Baca ini"}
          />

          <div className="mt-10 border-t sm:mt-12">
            {FAQS.map((f) => (
              <details key={f.q} className="group border-b">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45" aria-hidden>
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </summary>
                <p className="pb-6 pr-10 text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
          ============================================================ */}
      <section className="landing-section px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="lp-invert rounded-3xl px-6 py-14 text-center sm:px-14 sm:py-20">
            <h2 className="lp-display text-4xl sm:text-6xl">
              {isEn ? (
                <>Start saving on AI <em>today</em></>
              ) : (
                <>Hemat biaya AI <em>mulai hari ini</em></>
              )}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {isEn
                ? "Pick a token package, pay via QRIS, and your API key is ready in seconds."
                : "Pilih paket token, bayar via QRIS, API key siap dalam hitungan detik."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a href="#paket" className="lp-btn min-h-12 px-7 text-sm">
                {isEn ? "See token packages" : "Lihat paket token"}
              </a>
              {!isAuthed && (
                <Link href="/register" className="lp-btn-ghost min-h-12 px-7 text-sm">
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
      <footer className="landing-section px-4 pb-24 pt-12 sm:px-6 sm:pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <div className="col-span-2 lg:col-span-1">
              <Link href="/" className="lp-display text-2xl text-foreground">
                9inference
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

          <div className="mt-12 border-t pt-6 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
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
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="lp-eyebrow">{eyebrow}</p>
      <h2 className="lp-display mt-4 text-[2rem] sm:text-5xl">{title}</h2>
      {desc && <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{desc}</p>}
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
      <div className="lp-eyebrow">{title}</div>
      <ul className="mt-4 space-y-2">
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

/** Status model satu warna: titik penuh = aktif, cincin kosong = pemeliharaan. */
function ModelStatus({ maintenance, tc }: { maintenance: boolean; tc: (key: string) => string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[12px] ${maintenance ? "text-muted-foreground" : "text-foreground"}`}>
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${maintenance ? "ring-1 ring-inset ring-white/50" : "bg-foreground"}`}
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
      <div className="rounded-2xl border p-10 text-center text-sm text-muted-foreground">
        {isEn ? "Prices are being updated." : "Harga sedang diperbarui."}
      </div>
    );
  }
  const nf = (n: number) => n.toLocaleString(isEn ? "en-US" : "id-ID");
  const toks = (n: number) => (n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const perM = isEn ? "/ 1M tokens" : "/ 1 juta token";
  const th = "px-6 py-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground";

  return (
    <div className="overflow-hidden rounded-2xl border">
      {/* HP: daftar ringkas, tanpa scroll horizontal */}
      <ul className="md:hidden">
        {models.map((m) => (
          <li key={m.id} className="border-b px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/models/${encodeURIComponent(m.modelId)}`}
                  className="block truncate text-[15px] font-medium text-foreground"
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
                <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Input</dt>
                <dd className="mt-1 font-mono text-foreground">Rp{nf(m.inputPricePerMillion)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Output</dt>
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
            <tr className="border-b text-left">
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
              <tr key={m.id} className="border-b transition-colors hover:bg-white/[0.03]">
                <td className="px-6 py-4">
                  <Link
                    href={`/models/${encodeURIComponent(m.modelId)}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {m.name}
                  </Link>
                  <code className="mt-0.5 block text-[11px] text-muted-foreground">{m.modelId}</code>
                </td>
                <td className="px-6 py-4 text-[13px] text-muted-foreground">{m.provider}</td>
                <td className="px-6 py-4 font-mono text-[12px] text-muted-foreground">{m.contextWindow || "—"}</td>
                <td className="px-6 py-4 text-right">
                  <div className="font-mono text-foreground">Rp{nf(m.inputPricePerMillion)}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{toks(m.inputPricePerMillion)} TOKS</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="font-mono text-foreground">Rp{nf(m.outputPricePerMillion)}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{toks(m.outputPricePerMillion)} TOKS</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <ModelStatus maintenance={m.maintenanceMode} tc={tc} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3.5 text-[12px] leading-relaxed text-muted-foreground sm:px-6">
        {t("pricingTableNote")}
      </div>
    </div>
  );
}
