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
  title: "OneRouter — One API. The World's Best AI Models.",
  description:
    "Access leading AI models through a unified OpenAI-compatible inference API. Fast, reliable, and built for developers. GLM, DeepSeek, Qwen, Kimi & more — one API key.",
  keywords: [
    "AI inference API",
    "OpenAI compatible API",
    "LLM gateway",
    "GLM API",
    "DeepSeek API",
    "Qwen API",
    "AI infrastructure",
    "developer AI platform",
  ],
  openGraph: {
    title: "OneRouter — One API. The World's Best AI Models.",
    description:
      "Access leading AI models through a unified OpenAI-compatible inference API. Fast, reliable, and built for developers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneRouter — One API. The World's Best AI Models.",
    description:
      "Access leading AI models through a unified OpenAI-compatible inference API.",
  },
};

const INFRA_FEATURES = [
  {
    title: "Unified API",
    desc: "One endpoint to access multiple frontier AI models. Switch models with a single parameter — no SDK changes.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M4 7h16M4 12h10M4 17h7M17 17l4 4M21 17l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Fast Inference",
    desc: "Optimized routing for low-latency responses. Smart failover keeps your requests fast and resilient.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "OpenAI Compatible",
    desc: "Works instantly with existing SDKs. Change the base URL and ship — no rewrites, no lock-in.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="m8 16-4-4 4-4M16 8l4 4-4 4M14 4l-4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Secure & Reliable",
    desc: "Enterprise-grade API key management, per-key rate limits, and encrypted credentials. Your data stays yours.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const TRUST_AUDIENCES = [
  { name: "Startups", desc: "Ship AI features without managing multiple providers." },
  { name: "Developers", desc: "A clean, documented API that just works." },
  { name: "Researchers", desc: "Benchmark models side-by-side from one interface." },
  { name: "AI Engineers", desc: "Production-grade routing, observability, and control." },
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
  if (/code|coder/.test(h)) return "Coding";
  if (/fast|flash/.test(h)) return "Low Latency";
  if (/pro|reason/.test(h)) return "Reasoning";
  return "General Intelligence";
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
              OpenAI-compatible inference · {modelCount} models live
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              One API.
              <br />
              <span className="gradient-text-accent">The World's Best</span>
              <br />
              AI Models.
            </h1>

            {/* Subheadline */}
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Access leading AI models through a unified OpenAI-compatible inference API.
              Fast, reliable, and built for developers.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-accent group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm"
              >
                Start Building
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/dashboard/docs"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M4 4a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm9-2v5h5M8 13h8M8 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                View Documentation
              </Link>
            </div>

            {/* Mini trust row */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Pay per token
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Drop-in OpenAI replacement
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
              Frontier models, one gateway
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
              Developer Infrastructure
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Infrastructure for production AI
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Everything you need to ship reliable AI features — from routing to billing —
              behind a single, predictable API.
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
                Model Catalog
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Frontier models, ready to call
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                {modelCount} production-ready models from leading providers — all behind one
                API key, billed per token.
              </p>
            </div>
            <Link
              href="/dashboard/models"
              className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-[13px] font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              Browse all models →
            </Link>
          </div>

          {models.length === 0 ? (
            <div className="glass mt-12 rounded-2xl p-16 text-center text-sm text-muted-foreground">
              Model catalog is being updated.
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
              Performance
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for scale and speed
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
              Developer Experience
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From zero to inference in minutes
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              If you've used the OpenAI SDK, you already know OneRouter. Point your client at
              our base URL and you're done.
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
              Pricing
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Simple usage-based pricing
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Pay only for the tokens you use. No subscriptions. No hidden fees.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <PremiumPricingTable models={models} />
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="btn-accent inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm"
            >
              Start Building
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              View full pricing
            </Link>
          </div>
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
              Trusted by builders
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for developers building the future
              <br className="hidden sm:block" /> of AI applications
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
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ship AI features faster
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Get an API key in minutes. One endpoint, every model, billed per token.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-accent inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm"
              >
                Start Building
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/dashboard/docs"
                className="rounded-xl border border-white/10 bg-white/[0.02] px-7 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                Read the docs
              </Link>
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
                  1R
                </span>
                <span className="text-[15px] font-semibold tracking-tight">OneRouter</span>
              </Link>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                One API. The world's best AI models. Built for developers.
              </p>
            </div>

            <FooterCol
              title="Platform"
              links={[
                { label: "Models", href: "/#models" },
                { label: "Pricing", href: "/#pricing" },
                { label: "Playground", href: "/dashboard/chat" },
                { label: "Dashboard", href: "/dashboard" },
              ]}
            />
            <FooterCol
              title="Developers"
              links={[
                { label: "Documentation", href: "/dashboard/docs" },
                { label: "API Keys", href: "/dashboard/api-keys" },
                { label: "Usage", href: "/dashboard/usage" },
                { label: "Settings", href: "/dashboard/settings" },
              ]}
            />
            <FooterCol
              title="Account"
              links={[
                { label: "Sign in", href: "/login" },
                { label: "Start Building", href: "/register" },
                { label: "Billing", href: "/dashboard/wallet" },
              ]}
            />
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
            <p className="text-[12px] text-muted-foreground">
              © {new Date().getFullYear()} OneRouter. All rights reserved.
            </p>
            <p className="text-[12px] text-muted-foreground">
              Pay only for what you use. No subscriptions. No hidden fees.
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
          {isLive ? "Live" : "Maintenance"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-[12px]">
        <div>
          <div className="text-[10px] text-muted-foreground">Context</div>
          <div className="mt-0.5 font-semibold text-foreground">
            {model.contextWindow ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Capability</div>
          <div className="mt-0.5 font-semibold text-foreground">{cap}</div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4">
        <code className="flex-1 truncate rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-1.5 font-mono text-[11px] text-foreground/80">
          {model.modelId}
        </code>
        <Link
          href="/dashboard/chat"
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:border-white/20"
        >
          Try
        </Link>
      </div>
    </div>
  );
}

function PremiumPricingTable({ models }: { models: ModelCardData[] }) {
  if (models.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
        Pricing is being updated.
      </div>
    );
  }
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-left">
              {["Model", "Provider", "Context", "Input / 1M", "Output / 1M", "Status"].map((h) => (
                <th
                  key={h}
                  className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${
                    h === "Input / 1M" || h === "Output / 1M" ? "text-right" : ""
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
                <td className="px-5 py-4 text-right font-mono text-foreground">
                  Rp{m.inputPricePerMillion.toLocaleString("id-ID")}
                </td>
                <td className="px-5 py-4 text-right font-mono text-foreground">
                  Rp{m.outputPricePerMillion.toLocaleString("id-ID")}
                </td>
                <td className="px-5 py-4 text-center">
                  {m.maintenanceMode ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Maintenance
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                      Live
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/[0.08] px-5 py-3.5 text-[11px] text-muted-foreground">
        Prices per 1 million tokens. You only pay for tokens consumed — no subscriptions, no hidden fees.
      </div>
    </div>
  );
}
