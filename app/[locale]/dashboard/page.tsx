import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getOrCreateWallet, getTransactions } from "@/app/lib/wallet";
import { getWalletSummary } from "@/app/lib/usage-stats";
import { getAvailableModels } from "@/app/lib/models";
import { TOKS_LABEL, idrToToks } from "@/app/lib/constants";
import { Link } from "@/i18n/navigation";
import { AnimatedCounter } from "@/app/components/animated-counter";
import { ModelCard } from "@/app/components/model-card";
import { toModelCardData } from "@/app/lib/model-card-data";
import { RevealKey } from "./reveal-key";

export const dynamic = "force-dynamic";

const API_BASE_URL = "https://9inference.cloud/v1";

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 11) return "Good morning";
  if (h < 15) return "Good afternoon";
  if (h < 19) return "Good evening";
  return "Good night";
}

type MetricProps = {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  sub: string;
  icon: React.ReactNode;
  delay?: string;
};

function MetricCard({ label, value, decimals = 0, prefix, suffix, sub, icon, delay }: MetricProps) {
  return (
    <div className={`glass card-hover rounded-2xl p-5 ${delay ?? ""}`}>
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-accent">
          {icon}
        </span>
      </div>
      <div className="mt-4 text-[12px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
        <AnimatedCounter value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Sparkline({ data }: { data: { label: string; cost: number }[] }) {
  const max = Math.max(...data.map((d) => d.cost), 0.0001);
  const w = 100;
  const h = 32;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data.map((d, i) => {
    const x = i * step;
    const y = h - (d.cost / max) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(" L ")}`;
  const area = `${path} L ${w},${h} L 0,${h} Z`;
  const hasData = data.some((d) => d.cost > 0);

  return (
    <div className="flex items-end gap-2">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 flex-1">
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,255,136,0.35)" />
            <stop offset="100%" stopColor="rgba(0,255,136,0)" />
          </linearGradient>
        </defs>
        {hasData && (
          <>
            <path d={area} fill="url(#spark)" />
            <path
              d={path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {!hasData && (
          <line x1="0" y1={h - 2} x2={w} y2={h - 2} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
        )}
      </svg>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const wallet = await getOrCreateWallet(userId);
  const walletId = wallet.id;
  const balance = Number(wallet.balance);

  const [
    summary,
    recentTransactions,
    availableModels,
    apiKeys,
    tokensAgg,
    totalRequests,
    monthlySpendAgg,
    avgLatencyAgg,
    sevenDayLogs,
  ] = await Promise.all([
    getWalletSummary(userId),
    getTransactions(walletId, 7),
    getAvailableModels(),
    prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.usageLog.aggregate({
      where: { userId, status: "success" },
      _sum: { totalTokens: true },
    }),
    prisma.usageLog.count({ where: { userId } }),
    prisma.usageLog.aggregate({
      where: { userId, status: "success", createdAt: { gte: startOfMonth } },
      _sum: { totalCost: true },
    }),
    prisma.apiRequestLog.aggregate({
      where: { userId },
      _avg: { responseTime: true },
      _count: true,
    }),
    prisma.usageLog.findMany({
      where: { userId, status: "success", createdAt: { gte: sevenDaysAgo } },
      select: { totalCost: true, createdAt: true },
    }),
  ]);

  const balanceToks = idrToToks(balance);
  const totalTokens = Number(tokensAgg._sum.totalTokens ?? 0);
  const monthlySpend = Number(monthlySpendAgg._sum.totalCost ?? 0);
  const monthlySpendToks = idrToToks(monthlySpend);
  const avgLatency = Math.round(Number(avgLatencyAgg._avg.responseTime ?? 0));
  const latencySamples = Number(avgLatencyAgg._count ?? 0);

  const totalPurchased = summary.totalPurchased;
  const totalUsed = summary.totalUsed;
  const usagePct =
    totalPurchased > 0 ? Math.min(100, (totalUsed / totalPurchased) * 100) : 0;

  const trend: { label: string; cost: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const cost = sevenDayLogs
      .filter((l) => l.createdAt >= d && l.createdAt < next)
      .reduce((s, l) => s + Number(l.totalCost), 0);
    trend.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      cost: idrToToks(cost),
    });
  }

  const firstName = (session?.user?.name || session?.user?.email || "Developer").split(/[\s@.]+/)[0];
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const isEmpty = balance <= 0;
  const isLow = !isEmpty && usagePct >= 85;
  const statusLabel = isEmpty ? "No balance" : isLow ? "Low credits" : "Active";
  const statusColor = isEmpty
    ? "text-red-400 border-red-500/30 bg-red-500/10"
    : isLow
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-accent border-accent/30 bg-accent/10";

  const featuredModels = availableModels.slice(0, 3).map(toModelCardData);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero */}
      <section className="animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[12px] font-medium text-muted-foreground">{dateString}</div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting(now)}, <span className="gradient-text-accent">{firstName}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your AI infrastructure usage at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/chat"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open Playground
            </Link>
            <Link
              href="/dashboard/wallet"
              className="btn-accent rounded-lg px-3.5 py-2 text-xs"
            >
              + Add Credits
            </Link>
          </div>
        </div>
      </section>

      {/* Metric cards */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <MetricCard
          label="Credit Balance"
          value={balanceToks}
          decimals={2}
          suffix={` ${TOKS_LABEL}`}
          sub={`≈ Rp${balance.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`}
          delay="animate-fade-up"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
              <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M2 10h20M6 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
        />
        <MetricCard
          label="Total Requests"
          value={totalRequests}
          sub="API calls"
          delay="animate-fade-up-delay-1"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <MetricCard
          label="Tokens Consumed"
          value={totalTokens}
          sub="prompt + completion"
          delay="animate-fade-up-delay-2"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
              <path d="M4 7h16M4 12h10M4 17h7M17 17l4 4M21 17l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <MetricCard
          label="Avg Latency"
          value={avgLatency}
          suffix=" ms"
          sub={`${latencySamples.toLocaleString("id-ID")} sampel`}
          delay="animate-fade-up-delay-3"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <MetricCard
          label="Monthly Spend"
          value={monthlySpendToks}
          decimals={2}
          suffix={` ${TOKS_LABEL}`}
          sub="this month"
          delay="animate-fade-up-delay-4"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </section>

      {/* Wallet widget + Quickstart */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Fintech wallet widget */}
        <div className="glass card-hover relative overflow-hidden rounded-2xl p-6 lg:col-span-2 animate-fade-up-delay-2">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60"
            style={{ background: "radial-gradient(circle, rgba(0,255,136,0.12) 0%, transparent 70%)" }}
          />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                AI Credits Balance
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  <AnimatedCounter value={balanceToks} decimals={2} />
                </span>
                <span className="mb-1 text-sm font-semibold text-muted-foreground">{TOKS_LABEL}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                ≈ Rp{balance.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusColor}`}>
              ● {statusLabel}
            </span>
          </div>

          {/* Usage progress */}
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Credit utilization</span>
              <span className="font-medium text-foreground">
                {idrToToks(totalUsed).toLocaleString("id-ID", { maximumFractionDigits: 2 })} /{" "}
                {idrToToks(totalPurchased).toLocaleString("id-ID", { maximumFractionDigits: 0 })}{" "}
                {TOKS_LABEL}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${usagePct}%`,
                  background:
                    isLow || isEmpty
                      ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                      : "linear-gradient(90deg, var(--accent), #16d97a)",
                  boxShadow: isLow || isEmpty ? "none" : "0 0 12px var(--accent-glow)",
                }}
              />
            </div>
            <div className="mt-1.5 text-[10px] text-muted-foreground">
              {usagePct.toFixed(1)}% of purchased credits used
            </div>
          </div>

          {/* 7-day trend */}
          <div className="relative mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Spending · last 7 days</span>
              <span className="text-[11px] font-semibold text-foreground">
                {trend.reduce((s, d) => s + d.cost, 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })}{" "}
                {TOKS_LABEL}
              </span>
            </div>
            <div className="mt-3">
              <Sparkline data={trend} />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/70">
              {trend.map((d) => (
                <span key={d.label}>{d.label[0]}</span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="relative mt-5 flex flex-wrap gap-2">
            <Link href="/dashboard/wallet" className="btn-accent rounded-lg px-4 py-2.5 text-xs">
              + Add Credits
            </Link>
            <Link
              href="/dashboard/wallet"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              View Transactions
            </Link>
          </div>

          {isEmpty && (
            <div className="relative mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-3 text-[11px] text-amber-400">
              Credits depleted — AI services are paused until you top up.{" "}
              <Link href="/dashboard/wallet" className="font-semibold underline">
                Add credits →
              </Link>
            </div>
          )}
        </div>

        {/* Quickstart card */}
        <div className="glass card-hover rounded-2xl p-6 animate-fade-up-delay-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-accent-2">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="m8 16-4-4 4-4M16 8l4 4-4 4M14 4l-4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="text-sm font-semibold tracking-tight">Start building</h3>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            OpenAI-compatible endpoint. Drop your API key and start shipping.
          </p>

          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Base URL
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2">
              <code className="flex-1 truncate font-mono text-[11px] text-foreground">{API_BASE_URL}</code>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Auth header
            </div>
            <div className="mt-1.5 rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2">
              <code className="font-mono text-[11px] text-foreground">Authorization: Bearer sk_live_…</code>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/dashboard/docs"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center text-xs font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              View documentation
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="text-center text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              Manage API keys →
            </Link>
          </div>
        </div>
      </section>

      {/* Model marketplace preview */}
      <section className="animate-fade-up-delay-3">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Models</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {availableModels.length} models available across providers
            </p>
          </div>
          <Link
            href="/dashboard/models"
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Browse all →
          </Link>
        </div>
        {featuredModels.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No models available right now.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredModels.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        )}
      </section>

      {/* API Keys + Recent transactions */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* API Keys */}
        <div className="glass rounded-2xl p-6 animate-fade-up-delay-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">API Keys</h2>
            <Link
              href="/dashboard/api-keys"
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Manage →
            </Link>
          </div>
          {apiKeys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
              <Link
                href="/dashboard/api-keys"
                className="mt-3 inline-block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium transition hover:border-white/20"
              >
                Generate a key
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {apiKeys.map((key) => {
                const isExpired = key.expiresAt ? new Date(key.expiresAt) <= new Date() : false;
                return (
                  <div
                    key={key.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition hover:border-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-[10px] font-mono text-muted-foreground">
                          {key.name?.[0]?.toUpperCase() ?? "K"}
                        </span>
                        <span className="truncate text-xs font-medium text-foreground">
                          {key.name || "Production Key"}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          isExpired
                            ? "border-red-500/25 bg-red-500/10 text-red-400"
                            : "border-accent/25 bg-accent/10 text-accent"
                        }`}
                      >
                        {isExpired ? "Expired" : "Active"}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <RevealKey rawKey={key.key ?? ""} isExpired={isExpired} />
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{key.requestCount.toLocaleString("id-ID")} requests</span>
                      <span>·</span>
                      <span>Created {key.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="glass rounded-2xl p-6 animate-fade-up-delay-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Recent Activity</h2>
            <Link
              href="/dashboard/wallet"
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              View all →
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
              No transactions yet.
            </div>
          ) : (
            <div className="space-y-1">
              {recentTransactions.map((t) => {
                const amt = Number(t.amount);
                const isPositive = amt > 0;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                          isPositive
                            ? "border-accent/20 bg-accent/10 text-accent"
                            : "border-white/10 bg-white/[0.03] text-muted-foreground"
                        }`}
                      >
                        {isPositive ? (
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                            <path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-foreground">
                          {t.type === "USAGE" ? t.description?.replace(/^AI usage:\s*/, "") ?? "Usage" : t.type}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {t.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-right font-mono text-xs font-semibold ${
                        isPositive ? "text-accent" : "text-foreground"
                      }`}
                    >
                      <div>
                        {isPositive ? "+" : "−"}
                        {idrToToks(Math.abs(amt)).toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        Rp{Math.abs(amt).toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
