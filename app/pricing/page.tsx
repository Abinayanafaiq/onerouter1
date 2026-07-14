import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/site-header";
import { ModelPricingTable } from "@/app/components/model-pricing-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — Pay Per Token | OneRouter",
  description:
    "Simple usage-based pricing. 1 TOKS = Rp1,000 = US$0.0553. Pay only for the tokens you use. No subscriptions, no hidden fees, no lock-in.",
  openGraph: {
    title: "Pricing — Pay Per Token | OneRouter",
    description:
      "1 TOKS = Rp1,000 = US$0.0553. Pay only for what you use. No subscriptions.",
  },
};

const TOKS_TO_RP = 1000;
const TOKS_TO_USD = 0.0553;

const TRUST_BADGES = [
  {
    title: "No Subscription",
    desc: "No recurring bills or monthly commitments. Ever.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Top Up Anytime",
    desc: "Add credits only when you need them — you're in control.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Transparent Pricing",
    desc: "Clear rates upfront. No hidden fees, no surprise charges.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Bank-Grade Security",
    desc: "Encrypted API keys, per-key rate limits, SOC2-style controls.",
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
    quote:
      "We replaced three provider SDKs with a single OneRouter key. Onboarding took 10 minutes and our infra bill dropped.",
    name: "Andi Pratama",
    role: "CTO, PinjamCepat",
    initials: "AP",
  },
  {
    quote:
      "Pay-per-token with no subscription is exactly what our research lab needed. We benchmark 6 models from one endpoint.",
    name: "Sarah Wijaya",
    role: "ML Lead, Univ. Indonesia",
    initials: "SW",
  },
  {
    quote:
      "The failover routing saved our launch. When one provider throttled us, traffic moved automatically — zero downtime.",
    name: "Daniel Tan",
    role: "Founder, SaaSKit",
    initials: "DT",
  },
];

const FAQS = [
  {
    q: "What is a TOKS and how does pricing work?",
    a: "TOKS is our internal credit unit. 1 TOKS = Rp1,000 = US$0.0553. Each model has a per-1M-token rate in rupiah; you only pay for the tokens your requests actually consume. No subscription, no minimum.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. Sign up free, generate an API key, and top up credits whenever you're ready. You can start with any amount — there's no minimum deposit.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "Requests will return a top-up reminder instead of failing silently. Add credits in your wallet and you're back online in seconds. Your API keys and settings stay intact.",
  },
  {
    q: "Are there any hidden fees or subscriptions?",
    a: "None. You pay only for tokens consumed at the published rates. No monthly fee, no platform fee, no per-seat charge. The price you see is the price you pay.",
  },
  {
    q: "Can I switch models without changing my code?",
    a: "Yes. OneRouter is OpenAI-compatible — change the model parameter in your request and the rest of your SDK stays the same. Switch between GLM, DeepSeek, Qwen, Kimi and more with one line.",
  },
  {
    q: "Is my data and API key secure?",
    a: "API keys are hashed at rest, credentials are encrypted, and per-key rate limits prevent abuse. We never train on your data and never share prompts with third parties.",
  },
  {
    q: "Do you offer refunds for unused credits?",
    a: "Unused credits never expire. If you decide OneRouter isn't for you within 14 days of your first top-up, contact support for a full refund of the unused balance.",
  },
];

const COMPARISON = [
  { feature: "Single API key for all models", onerouter: true, direct: false },
  { feature: "Automatic failover routing", onerouter: true, direct: false },
  { feature: "Pay per token, no subscription", onerouter: true, direct: true },
  { feature: "OpenAI-compatible SDK", onerouter: true, direct: false },
  { feature: "Unified billing in IDR & USD", onerouter: true, direct: false },
  { feature: "Per-key rate limits & rotation", onerouter: true, direct: false },
  { feature: "Manage N provider accounts", onerouter: false, direct: true },
  { feature: "N separate invoices / month", onerouter: false, direct: true },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* ============================================================
          HERO + TOKS CONVERSION BANNER
          ============================================================ */}
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
            Pay As You Go · No Subscription
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent <span className="gradient-text-accent">per-token</span> pricing
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Pay only for the tokens you use. No subscriptions, no monthly commitments, no hidden fees.
            One API key unlocks every frontier model.
          </p>

          {/* TOKS conversion card — the centerpiece */}
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="glass relative overflow-hidden rounded-2xl p-6 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 -z-10"
                style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(0,255,136,0.10), transparent 70%)" }}
                aria-hidden
              />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Credit Conversion Rate
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="text-[11px] text-muted-foreground">1 TOKS</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">1 TOKS</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Base credit unit</div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="text-[11px] text-muted-foreground">Indonesian Rupiah</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">
                    Rp{TOKS_TO_RP.toLocaleString("id-ID")}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">per TOKS</div>
                </div>
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                  <div className="text-[11px] text-accent">US Dollar</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">
                    US${TOKS_TO_USD.toFixed(4)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">per TOKS</div>
                </div>
              </div>
              <p className="mt-4 text-[12px] text-muted-foreground">
                Top up in rupiah or USD — your credits are tracked in TOKS and converted automatically.
                Rates are fixed and shown before every request.
              </p>
            </div>
          </div>

          {/* Primary CTA — above the fold */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="btn-accent group inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm"
            >
              Get Your API Key — Free
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-7 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              Top Up Credits
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">
            No credit card required · Cancel anytime · 14-day refund guarantee
          </p>
        </div>
      </section>

      {/* ============================================================
          PRICING TABLE
          ============================================================ */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Model Catalog
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Per-token rates for every model
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
              Prices are per 1 million tokens and billed in rupiah. Convert to TOKS or USD instantly
              using the rate above.
            </p>
          </div>

          <ModelPricingTable />

          {/* Conversion helper line under table */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
            <span>
              <strong className="text-foreground">Rp1,000</strong> = 1 TOKS = <strong className="text-foreground">US$0.0553</strong>
            </span>
            <span className="hidden h-3 w-px bg-white/10 sm:inline-block" />
            <span>1M tokens = 1,000 × model rate in TOKS</span>
          </div>
        </div>
      </section>

      {/* ============================================================
          TRUST BADGES
          ============================================================ */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_BADGES.map((b) => (
              <div key={b.title} className="glass card-hover rounded-2xl p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-accent">
                  {b.icon}
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                  {b.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          COMPARISON vs GOING DIRECT
          ============================================================ */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Why OneRouter
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              One API vs. managing every provider yourself
            </h2>
          </div>

          <div className="glass mt-10 overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-left">
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Capability
                  </th>
                  <th className="px-5 py-4 text-center text-[13px] font-semibold text-accent">
                    OneRouter
                  </th>
                  <th className="px-5 py-4 text-center text-[13px] font-semibold text-muted-foreground">
                    Direct to providers
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 text-[13px] text-foreground">{row.feature}</td>
                    <td className="px-5 py-3.5 text-center">
                      {row.onerouter ? (
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

      {/* ============================================================
          TESTIMONIALS
          ============================================================ */}
      <section className="relative px-4 py-16 sm:px-6 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.05), transparent 70%)" }}
          aria-hidden
        />
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Trusted by builders
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Teams ship faster with OneRouter
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="glass card-hover flex flex-col rounded-2xl p-6">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-accent/60">
                  <path d="M7 7h4v6c0 3-2 5-4 5V7Zm10 0h4v6c0 3-2 5-4 5V7Z" fill="currentColor" />
                </svg>
                <blockquote className="mt-3 flex-1 text-[13px] leading-relaxed text-foreground/90">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
                    {t.initials}
                  </span>
                  <div className="leading-tight">
                    <div className="text-[13px] font-semibold text-foreground">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FAQ — objection handling
          ============================================================ */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              FAQ
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Questions, answered
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
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

      {/* ============================================================
          FINAL CTA — urgency + risk reversal
          ============================================================ */}
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
              Get started in under 5 minutes
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              Ship AI features today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Generate your API key now. One endpoint, every frontier model, billed per token —
              starting at 1 TOKS = Rp1,000 = US$0.0553.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-accent group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm"
              >
                Get Your Free API Key
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/dashboard/docs"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-7 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                Read the docs
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
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
                14-day refund guarantee
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Credits never expire
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
