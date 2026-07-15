import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/app/lib/auth";
import { getEnabledModels } from "@/app/lib/models";
import { toModelCardData, type ModelCardData } from "@/app/lib/model-card-data";
import { LandingHeader } from "@/app/components/landing/landing-header";
import { HeroTerminal } from "@/app/components/landing/hero-terminal";
import { AnimatedStats } from "@/app/components/landing/animated-stats";
import { CodeTabs } from "@/app/components/landing/code-tabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "API Model AI Murah — Bayar Per Token | DeepSeek, GLM, Qwen",
  description:
    "API model AI murah di Indonesia. Satu endpoint kompatibel OpenAI untuk DeepSeek, GLM, Qwen, Kimi & lainnya. Bayar per token (TOKS), harga transparan dalam rupiah, tanpa langganan.",
  keywords: [
    "API model murah",
    "API model AI murah",
    "token AI murah",
    "DeepSeek API murah",
    "alternatif OpenAI murah",
    "API AI Indonesia",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "9inference — API Model AI Murah, Bayar Per Token",
    description:
      "Gateway AI murah kompatibel OpenAI. DeepSeek, GLM, Qwen, Kimi — satu API key, bayar per token.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "9inference — API Model AI Murah, Bayar Per Token",
    description:
      "Gateway AI murah kompatibel OpenAI. DeepSeek, GLM, Qwen, Kimi — satu API key, bayar per token.",
  },
};

const INFRA_FEATURES = [
  {
    title: "API Terpadu",
    desc: "Satu endpoint untuk mengakses banyak model AI frontier. Ganti model dengan satu parameter — tanpa ubah SDK.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M4 7h16M4 12h10M4 17h7M17 17l4 4M21 17l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Inferensi Cepat",
    desc: "Routing dioptimalkan untuk latensi rendah. Failover cerdas menjaga request tetap cepat dan tangguh.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Kompatibel OpenAI",
    desc: "Langsung bekerja dengan SDK yang sudah ada. Cukup ganti base URL — tanpa rewrite, tanpa lock-in.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="m8 16-4-4 4-4M16 8l4 4-4 4M14 4l-4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Aman & Andal",
    desc: "Manajemen API key kelas enterprise, rate limit per-key, dan kredensial terenkripsi. Data Anda tetap milik Anda.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const TRUST_AUDIENCES = [
  { name: "Startup", desc: "Rilis fitur AI tanpa mengelola banyak provider." },
  { name: "Developer", desc: "API yang bersih, terdokumentasi, dan langsung jalan." },
  { name: "Peneliti", desc: "Bandingkan model berdampingan dari satu antarmuka." },
  { name: "AI Engineer", desc: "Routing, observabilitas, dan kontrol siap produksi." },
];

const PROVIDER_DOT: Record<string, string> = {
  GLM: "bg-emerald-400",
  DeepSeek: "bg-violet-400",
  Alibaba: "bg-orange-400",
  "Moonshot AI": "bg-sky-400",
  MiniMax: "bg-pink-400",
};

function capabilityLabel(name: string, modelId: string): string {
  const h = (name + " " + modelId).toLowerCase();
  if (/code|coder/.test(h)) return "Koding";
  if (/fast|flash/.test(h)) return "Latensi Rendah";
  if (/pro|reason/.test(h)) return "Penalaran";
  return "Kecerdasan Umum";
}

export default async function Home() {
  const [session, enabledModels] = await Promise.all([auth(), getEnabledModels()]);
  const isAuthed = !!session?.user;
  const models: ModelCardData[] = enabledModels.map(toModelCardData);
  const modelCount = models.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <LandingHeader isAuthed={isAuthed} />

      {/* ============================================================
          HERO
          ============================================================ */}
      <section className="relative px-4 pt-32 pb-20 sm:px-6 sm:pt-40 sm:pb-28">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 15% 0%, rgba(0,255,136,0.08) 0%, transparent 60%), radial-gradient(50% 50% at 100% 0%, rgba(99,102,241,0.10) 0%, transparent 55%), radial-gradient(80% 60% at 50% 120%, rgba(99,102,241,0.05) 0%, transparent 60%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-[-6%] -z-10 h-[480px] w-[760px] -translate-x-1/2 rounded-full blur-[150px] animate-pulse-soft"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%)" }}
          aria-hidden
        />

        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: copy */}
          <div className="animate-fade-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Inferensi kompatibel OpenAI · {modelCount} model aktif
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              API Model AI
              <br />
              <span className="gradient-text-accent">Murah</span>
              <br />
              Bayar Per Token.
            </h1>

            {/* Subheadline */}
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Gateway inferensi kompatibel OpenAI untuk DeepSeek, GLM, Qwen, Kimi & lainnya.
              Harga token transparan dalam rupiah — tanpa langganan, tanpa biaya tersembunyi.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-accent group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm"
              >
                Mulai gratis — API key instan
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                Lihat harga token
              </Link>
            </div>
            <p className="mt-3 text-[12px] text-muted-foreground">
              Setup &lt; 2 menit · Tanpa kartu kredit · Bayar per token
            </p>

            {/* Mini trust row */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Tanpa kartu kredit
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                1 TOKS = Rp1.000
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Drop-in OpenAI
              </span>
            </div>
          </div>

          {/* Right: terminal */}
          <div className="animate-fade-up-delay-2">
            <HeroTerminal />
          </div>
        </div>
      </section>

      {/* ============================================================
          LOGO STRIP / PROVIDERS
          ============================================================ */}
      <section className="border-y border-white/[0.05] bg-white/[0.015] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Model frontier, satu gateway
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {["GLM", "DeepSeek", "Alibaba Qwen", "Moonshot AI", "MiniMax"].map((p) => (
                <span key={p} className="text-sm font-semibold tracking-tight text-muted-foreground transition hover:text-foreground">
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
      <section id="platform" className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Infrastruktur Developer
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Infrastruktur untuk AI produksi
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Semua yang Anda butuhkan untuk merilis fitur AI andal — dari routing hingga billing —
              di balik satu API yang prediktabel.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INFRA_FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`glass card-hover rounded-2xl p-6 ${[`animate-fade-up`, `animate-fade-up-delay-1`, `animate-fade-up-delay-2`, `animate-fade-up-delay-3`][i]}`}
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
      <section id="models" className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Katalog Model
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Model frontier, siap dipanggil
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                {modelCount} model siap produksi dari provider terkemuka — semua di balik satu
                API key, ditagih per token.
              </p>
            </div>
            <Link
              href="/models"
              className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-[13px] font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              Lihat semua model →
            </Link>
          </div>

          {models.length === 0 ? (
            <div className="glass mt-12 rounded-2xl p-16 text-center text-sm text-muted-foreground">
              Katalog model sedang diperbarui.
            </div>
          ) : (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {models.slice(0, 6).map((m) => (
                <ModelShowcaseCard key={m.id} model={m} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          PERFORMANCE METRICS
          ============================================================ */}
      <section className="relative px-4 py-24 sm:px-6 sm:py-28">
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
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Dibangun untuk skala dan kecepatan
            </h2>
          </div>
          <div className="mt-14">
            <AnimatedStats />
          </div>
        </div>
      </section>

      {/* ============================================================
          DEVELOPER EXPERIENCE
          ============================================================ */}
      <section className="px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Pengalaman Developer
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Dari nol ke inferensi dalam hitungan menit
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
      <section id="pricing" className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Harga
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Harga sederhana berbasis pemakaian
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Bayar hanya untuk token yang Anda pakai. Tanpa langganan. Tanpa biaya tersembunyi.
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
            <PremiumPricingTable models={models} />
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="btn-accent group inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm"
            >
                Daftar gratis
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/models"
                className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                Lihat semua model
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
      <section className="relative px-4 py-24 sm:px-6 sm:py-32">
        <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(0,255,136,0.04), transparent 70%)" }}
          aria-hidden
        />
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Dipercaya builder
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Dibuat untuk developer yang membangun masa depan
              <br className="hidden sm:block" /> aplikasi AI
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
              Siap coba? Daftar gratis
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
      <section className="px-4 py-24 sm:px-6">
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
              {modelCount} model · Bayar per token · 1 TOKS = Rp1.000
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              Hemat biaya AI mulai hari ini
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Daftar gratis, dapat API key instan. Satu endpoint multi-model, bayar hanya token yang dipakai —
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
                Tanpa kartu kredit
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
                API model AI murah — bayar per token, kompatibel OpenAI, untuk developer Indonesia.
              </p>
            </div>

            <FooterCol
              title="Platform"
              links={[
                { label: "Model AI Murah", href: "/models" },
                { label: "Harga Token", href: "/pricing" },
                { label: "Blog", href: "/blog" },
                { label: "Dashboard", href: "/dashboard" },
              ]}
            />
            <FooterCol
              title="Belajar"
              links={[
                { label: "API Model AI Murah", href: "/blog/api-model-ai-murah-indonesia" },
                { label: "DeepSeek API Murah", href: "/blog/deepseek-api-murah-cara-pakai" },
                { label: "Alternatif OpenAI", href: "/blog/alternatif-openai-api-murah" },
                { label: "Bayar Per Token", href: "/blog/bayar-per-token-vs-langganan" },
              ]}
            />
            <FooterCol
              title="Akun"
              links={[
                { label: "Masuk", href: "/login" },
                { label: "Daftar gratis", href: "/register" },
                { label: "Isi Saldo", href: "/dashboard/wallet" },
              ]}
            />
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
            <p className="text-[12px] text-muted-foreground">
              © {new Date().getFullYear()} 9inference. Hak cipta dilindungi.
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

function ModelShowcaseCard({ model }: { model: ModelCardData }) {
  const cap = capabilityLabel(model.name, model.modelId);
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

function PremiumPricingTable({ models }: { models: ModelCardData[] }) {
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
                      Pemeliharaan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                      Aktif
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/[0.08] px-5 py-3.5 text-[11px] text-muted-foreground">
        Harga per 1 juta token. <strong className="text-foreground">1 TOKS = Rp1.000 = US$0.0553</strong>. Anda hanya membayar token yang dipakai — tanpa langganan, tanpa biaya tersembunyi.
      </div>
    </div>
  );
}
