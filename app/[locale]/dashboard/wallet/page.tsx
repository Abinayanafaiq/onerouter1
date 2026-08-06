import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/app/lib/auth";
import { getOrCreateWallet, getTransactions } from "@/app/lib/wallet";
import { getWalletSummary } from "@/app/lib/usage-stats";
import { prisma } from "@/app/lib/prisma";
import { IDR_PER_TOKS, TOKS_LABEL, idrToToks, idrToUsd, USD_PER_TOKS } from "@/app/lib/constants";
import { isBscConfigured } from "@/app/lib/crypto-bsc";
import { getTelegramGroupUrl } from "@/app/lib/telegram";
import { ADMIN_EMAIL } from "@/app/lib/constants";
import { Link } from "@/i18n/navigation";
import { WalletTopUpForm } from "./topup-form";

/* ------------------------------------------------------------------ */
/* Inline icons                                                        */
/* ------------------------------------------------------------------ */
type IconProps = { className?: string };

function WalletIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M2 10h20M6 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function TrendingUpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 3v18h18M7 14l3-4 3 3 5-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ActivityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 12h4l3 8 4-16 3 8h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MessageCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8.5 9h7M8.5 12.5h4M21 12a8.5 8.5 0 0 1-11.8 7.8L4 21l1.2-5.2A8.5 8.5 0 1 1 21 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 7.6 7.5 9 4.3-1.4 7.5-4.5 7.5-9V6L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function InfoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5M12 8v.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function fmtToks(toks: number, locale: string, max = 4): string {
  return toks.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: max });
}

/** Reference currency for an IDR amount: Rp for id, US$ for en. */
function fmtIdrRef(idr: number, locale: string, max = 2): string {
  if (locale === "en") {
    return "US$" + idrToUsd(idr).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return "Rp" + idr.toLocaleString(locale, { maximumFractionDigits: max });
}

function fmtDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

/* ------------------------------------------------------------------ */
/* Collapsible FAQ (client island)                                     */
/* ------------------------------------------------------------------ */
function FaqList({ faqs }: { faqs: { q: string; a: string }[] }) {
  // Server-rendered open by default to keep this a server component;
  // the wallet page stays fully server-rendered except the top-up form.
  return (
    <div className="space-y-2">
      {faqs.map((f, i) => (
        <details
          key={i}
          className="group rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-white/10"
          open={i === 0}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-foreground list-none">
            <span>{f.q}</span>
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default async function WalletPage() {
  const t = await getTranslations("Wallet");
  const locale = await getLocale();
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const wallet = await getOrCreateWallet(userId);
  const [transactions, summary, bscConfigured, telegramGroupUrl, lastOrder] = await Promise.all([
    getTransactions(wallet.id, 100),
    getWalletSummary(userId),
    isBscConfigured(),
    getTelegramGroupUrl(),
    prisma.order.findFirst({
      where: { userId, whatsapp: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { whatsapp: true },
    }),
  ]);

  const balance = Number(wallet.balance);
  const balanceToks = idrToToks(balance);
  const isEmpty = balance <= 0;

  const supportUrl = telegramGroupUrl || `mailto:${ADMIN_EMAIL}`;
  const supportIsTelegram = !!telegramGroupUrl;

  const trustBadges = [
    t("trustInstantTopUp"),
    t("trustAutoConfirm"),
    t("trustSecurePayment"),
    t("trustRefundAvailable"),
    t("trustNoSubscription"),
  ];

  const faqs = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
  ];

  const overview = [
    {
      label: t("statBalanceLabel"),
      value: `${fmtToks(summary.balanceToks, locale)} ${TOKS_LABEL}`,
      sub: t("statBalanceSub", {
        amount: fmtIdrRef(balance, locale),
      }),
      icon: <WalletIcon className="h-5 w-5" />,
      accent: isEmpty ? "text-red-500" : "text-green-500",
    },
    {
      label: t("statPurchasedLabel"),
      value: `${fmtToks(idrToToks(summary.totalPurchased), locale)} ${TOKS_LABEL}`,
      sub: t("statPurchasedSub"),
      icon: <TrendingUpIcon className="h-5 w-5" />,
      accent: "text-foreground",
    },
    {
      label: t("statUsedLabel"),
      value: `${fmtToks(idrToToks(summary.totalUsed), locale)} ${TOKS_LABEL}`,
      sub: t("statUsedSub", { count: summary.totalRequests }),
      icon: <ActivityIcon className="h-5 w-5" />,
      accent: "text-foreground",
    },
    {
      label: t("statRemainingLabel"),
      value:
        summary.estimatedRemainingRequests === null
          ? "—"
          : summary.estimatedRemainingRequests.toLocaleString(locale),
      sub:
        summary.avgCostPerRequest > 0
          ? `~${fmtToks(idrToToks(summary.avgCostPerRequest), locale, 6)} ${TOKS_LABEL}/req`
          : t("statRemainingNoUsage"),
      icon: <ClockIcon className="h-5 w-5" />,
      accent: "text-foreground",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle", { unit: TOKS_LABEL })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground hover:border-white/20"
          >
            ← {t("backToDashboard")}
          </Link>
          <Link
            href="/dashboard/usage"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground hover:border-white/20"
          >
            {t("usageAnalytics")} →
          </Link>
        </div>
      </div>

      {/* Dashboard stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overview.map((o) => (
          <div
            key={o.label}
            className="glass card-hover rounded-[20px] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
                {o.icon}
              </span>
            </div>
            <div className="mt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {o.label}
            </div>
            <div className={`mt-1 text-xl font-bold leading-tight ${o.accent}`}>
              {o.value}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{o.sub}</div>
          </div>
        ))}
      </div>

      {/* Empty-state warning */}
      {isEmpty && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] px-5 py-4 text-sm text-red-400">
          {t("emptyWarning")}
        </div>
      )}

      {/* Two-column main layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT 70% — Top Up */}
        <div className="glass card-hover rounded-[24px] p-6 sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-bold tracking-tight">{t("topUpTitle")}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("topUpDesc", { unit: TOKS_LABEL })}
            </p>
          </div>

          <WalletTopUpForm
            whatsapp={lastOrder?.whatsapp}
            bscConfigured={bscConfigured}
          />
        </div>

        {/* RIGHT 30% — Sidebar */}
        <aside className="space-y-6">
          {/* Transaction Support Card */}
          <div className="relative overflow-hidden rounded-[20px] border border-green-500/20 bg-gradient-to-b from-green-500/[0.08] to-transparent p-6">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-green-500/10 blur-2xl" />
            <div className="relative">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-500/15 text-green-400 shadow-[0_0_24px_-6px_var(--accent-glow)]">
                <MessageCircleIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{t("supportTitle")}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("supportDesc")}
              </p>
              <a
                href={supportUrl}
                target={supportIsTelegram ? "_blank" : undefined}
                rel={supportIsTelegram ? "noopener noreferrer" : undefined}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 text-sm font-semibold text-black transition hover:brightness-110"
              >
                <MessageCircleIcon className="h-4 w-4" />
                {t("supportButton")}
              </a>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />
                <span>{t("supportWaNote")}</span>
              </p>
            </div>
          </div>

          {/* FAQ Card */}
          <div className="rounded-[20px] border border-white/[0.08] bg-card p-6">
            <h3 className="text-base font-semibold text-foreground">{t("faqTitle")}</h3>
            <div className="mt-4">
              <FaqList faqs={faqs} />
            </div>
          </div>

          {/* Payment Information */}
          <div className="rounded-[20px] border border-white/[0.08] bg-card p-6">
            <div className="flex items-center gap-2">
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">{t("paymentInfoTitle")}</h3>
            </div>
            <ul className="mt-4 space-y-3 text-xs text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-green-400"><CheckIcon className="h-3.5 w-3.5" /></span>
                <span>{t("paymentInfoRate", { unit: TOKS_LABEL, idr: IDR_PER_TOKS.toLocaleString(locale), usd: USD_PER_TOKS })}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-green-400"><CheckIcon className="h-3.5 w-3.5" /></span>
                <span>{t("paymentInfoQris")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-green-400"><CheckIcon className="h-3.5 w-3.5" /></span>
                <span>{t("paymentInfoUsdt")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-green-400"><CheckIcon className="h-3.5 w-3.5" /></span>
                <span>{t("paymentInfoDeduction")}</span>
              </li>
            </ul>
          </div>

          {/* Trust Badges */}
          <div className="rounded-[20px] border border-white/[0.08] bg-card p-6">
            <h3 className="text-base font-semibold text-foreground">{t("trustTitle")}</h3>
            <ul className="mt-4 space-y-2.5">
              {trustBadges.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm text-foreground">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-500/15 text-green-400">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Transaction History (full width) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("historyTitle")}
          </h2>
        </div>
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card divide-y divide-white/[0.06]">
            {transactions.map((tx) => {
              const amt = Number(tx.amount);
              const isPositive = amt > 0;
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 p-4 transition hover:bg-white/[0.02]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isPositive
                            ? "bg-green-500/15 text-green-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {tx.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tx.createdAt.toLocaleString(locale)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{tx.description}</div>
                  </div>
                  <div
                    className={`shrink-0 text-right font-mono text-sm font-bold ${
                      isPositive ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    <div>
                      {isPositive ? "+" : "-"}
                      {idrToToks(Math.abs(amt)).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 4 })} {TOKS_LABEL}
                    </div>
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {fmtIdrRef(Math.abs(amt), locale, 4)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
