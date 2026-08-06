"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TOKS_LABEL, idrToToks } from "@/app/lib/constants";
import { WALLET_REFRESH_EVENT } from "@/app/components/credit-badge";

type Summary = {
  balance: number;
  balanceToks: number;
  totalPurchased: number;
  totalUsed: number;
  totalRequests: number;
  avgCostPerRequest: number;
  estimatedRemainingRequests: number | null;
  lastTopUpAt: string | null;
  lastUsageAt: string | null;
};

type LogRow = {
  id: string;
  createdAt: string;
  model: string;
  modelName: string;
  provider: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  remainingBalance: number;
};

type ModelRow = {
  modelId: string | null;
  model: string;
  modelName: string;
  provider: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  avgCostPerRequest: number;
};

type Filters = {
  from: string;
  to: string;
  model: string;
  provider: string;
  status: string;
};

const PAGE_SIZE = 20;

function toks(idr: number, locale: string, max = 4): string {
  return idrToToks(idr).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  });
}

function fmtDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("Usage");
  const map: Record<string, { cls: string; label: string }> = {
    success: { cls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300", label: t("statusSuccess") },
    rejected: { cls: "border-amber-400/20 bg-amber-400/10 text-amber-300", label: t("statusRejected") },
    error: { cls: "border-red-400/20 bg-red-400/10 text-red-300", label: t("statusError") },
  };
  const s = map[status] || { cls: "bg-gray-500/15 text-gray-500", label: status };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

const CHART_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function BarChart({
  title,
  data,
  unit,
}: {
  title: string;
  data: { label: string; value: number }[];
  unit: string;
}) {
  const t = useTranslations("Usage");
  const locale = useLocale();
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <div className="min-h-64 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
      <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      {data.length === 0 ? (
        <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-white/10 text-xs text-muted-foreground">{t("chartNoData")}</div>
      ) : (
        <div className="space-y-4">
          {data.map((d, i) => (
            <div key={`${i}-${d.label}`}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
                <span className="max-w-[60%] truncate font-medium text-foreground/90" title={d.label}>{d.label}</span>
                <span className="whitespace-nowrap font-mono text-muted-foreground">
                  {d.value.toLocaleString(locale, { maximumFractionDigits: 4 })} {unit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: max > 0 ? `${(d.value / max) * 100}%` : "0%",
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UsageAnalytics({
  modelOptions,
  providerOptions,
}: {
  modelOptions: { model: string; name: string }[];
  providerOptions: string[];
}) {
  const t = useTranslations("Usage");
  const locale = useLocale();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [modelRows, setModelRows] = useState<ModelRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<LogRow | null>(null);
  const [filters, setFilters] = useState<Filters>({
    from: "",
    to: "",
    model: "",
    provider: "",
    status: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildQuery = useCallback((f: Filters, extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (f.from) params.set("from", new Date(f.from).toISOString());
    if (f.to) {
      // include the whole "to" day
      const to = new Date(f.to);
      to.setHours(23, 59, 59, 999);
      params.set("to", to.toISOString());
    }
    if (f.model) params.set("model", f.model);
    if (f.provider) params.set("provider", f.provider);
    if (f.status) params.set("status", f.status);
    if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return params.toString();
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/summary", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setSummary(data.summary);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadModelRows = useCallback(async (f: Filters) => {
    try {
      const q = buildQuery(f);
      const res = await fetch(`/api/usage/by-model?${q}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setModelRows(data.rows);
      }
    } catch {
      // ignore
    }
  }, [buildQuery]);

  const loadLogs = useCallback(async (f: Filters, p: number) => {
    setLoading(true);
    try {
      const q = buildQuery(f, { page: String(p), pageSize: String(PAGE_SIZE) });
      const res = await fetch(`/api/usage/logs?${q}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.rows);
          setTotal(data.total);
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [buildQuery]);

  const refreshAll = useCallback(
    (f: Filters, p: number) => {
      loadSummary();
      loadModelRows(f);
      loadLogs(f, p);
    },
    [loadSummary, loadModelRows, loadLogs],
  );

  useEffect(() => {
    refreshAll(appliedFilters, page);
  }, [appliedFilters, page, refreshAll]);

  // React to global wallet-refresh events (e.g. after a chat request)
  useEffect(() => {
    const onEvent = () => refreshAll(appliedFilters, page);
    window.addEventListener(WALLET_REFRESH_EVENT, onEvent);
    return () => window.removeEventListener(WALLET_REFRESH_EVENT, onEvent);
  }, [appliedFilters, page, refreshAll]);

  function applyFilters() {
    setPage(1);
    setAppliedFilters(filters);
  }

  function resetFilters() {
    const cleared = { from: "", to: "", model: "", provider: "", status: "" };
    setFilters(cleared);
    setPage(1);
    setAppliedFilters(cleared);
  }

  return (
    <div className="space-y-6">
      {/* Overview metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("metricCreditBalance")}
          value={summary ? `${summary.balanceToks.toLocaleString(locale, { maximumFractionDigits: 4 })} ${TOKS_LABEL}` : "…"}
          accent={summary && summary.balance <= 0 ? "text-red-500" : "text-green-500"}
          tone="accent"
        />
        <MetricCard
          label={t("metricTotalUsed")}
          value={summary ? `${toks(summary.totalUsed, locale)} ${TOKS_LABEL}` : "…"}
        />
        <MetricCard
          label={t("metricTotalRequests")}
          value={summary ? summary.totalRequests.toLocaleString(locale) : "…"}
        />
        <MetricCard
          label={t("metricEstimatedRemaining")}
          value={
            summary
              ? summary.estimatedRemainingRequests === null
                ? "—"
                : summary.estimatedRemainingRequests.toLocaleString(locale)
              : "…"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <BarChart
          title={t("chartRequestsByModel")}
          data={modelRows.map((m) => ({ label: m.modelName, value: m.requests }))}
          unit={t("unitRequest")}
        />
        <BarChart
          title={t("chartCostByModel")}
          data={modelRows.map((m) => ({ label: m.modelName, value: idrToToks(m.totalCost) }))}
          unit={TOKS_LABEL}
        />
        <BarChart
          title={t("chartTokensByModel")}
          data={modelRows.map((m) => ({ label: m.modelName, value: m.totalTokens }))}
          unit="tok"
        />
      </div>

      {/* Usage by model table */}
      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <div><h2 className="text-sm font-semibold">{t("byModelTitle")}</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{t("byModelSubtitle")}</p></div>
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1 font-mono text-[10px] text-muted-foreground">{t("byModelCount", { count: modelRows.length })}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07] bg-white/[0.025]">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">{t("colModel")}</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">{t("colProvider")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colRequests")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colInput")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colOutput")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colTotalTokens")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colTotalCost")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colAverage")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {modelRows.map((m, i) => (
                <tr key={`${m.model}-${m.provider}-${m.modelId ?? "null"}-${i}`} className="transition hover:bg-white/[0.025]">
                  <td className="px-3 py-3 font-medium text-foreground/90">{m.modelName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.provider}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{m.requests.toLocaleString(locale)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{m.inputTokens.toLocaleString(locale)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{m.outputTokens.toLocaleString(locale)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{m.totalTokens.toLocaleString(locale)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-red-500">{toks(m.totalCost, locale)} {TOKS_LABEL}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{toks(m.avgCostPerRequest, locale, 6)}</td>
                </tr>
              ))}
              {modelRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground text-sm">
                    {t("byModelEmpty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Activity history */}
      <section className="space-y-3">
        <div><h2 className="text-sm font-semibold">{t("historyTitle")}</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{t("historySubtitle")}</p></div>

        {/* Filters */}
        <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">{t("filterFromDate")}</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 text-xs outline-none transition focus:border-accent/40"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">{t("filterToDate")}</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 text-xs outline-none transition focus:border-accent/40"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">{t("filterModel")}</label>
            <select
              value={filters.model}
              onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value }))}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 text-xs outline-none transition focus:border-accent/40"
            >
              <option value="">{t("filterAll")}</option>
              {modelOptions.map((m) => (
                <option key={m.model} value={m.model}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">{t("filterProvider")}</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters((f) => ({ ...f, provider: e.target.value }))}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 text-xs outline-none transition focus:border-accent/40"
            >
              <option value="">{t("filterAll")}</option>
              {providerOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">{t("filterStatus")}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 text-xs outline-none transition focus:border-accent/40"
            >
              <option value="">{t("filterAll")}</option>
              <option value="success">{t("statusSuccess")}</option>
              <option value="rejected">{t("statusRejected")}</option>
              <option value="error">{t("statusError")}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="h-9 flex-1 rounded-lg bg-accent px-3 text-xs font-semibold text-black transition hover:brightness-110"
            >
              {t("filterApply")}
            </button>
            <button
              onClick={resetFilters}
              className="h-9 rounded-lg border border-white/10 px-3 text-xs text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground"
            >
              {t("filterReset")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.015]">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07] bg-white/[0.025]">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">{t("colTime")}</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">{t("colModel")}</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">{t("colProvider")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colInput")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colOutput")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colTotal")}</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">{t("colCost")}</th>
                <th className="text-center px-3 py-2 font-medium text-xs text-muted-foreground">{t("colStatus")}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground text-sm">
                    {t("loading")}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground text-sm">
                    {t("historyEmpty")}
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="transition hover:bg-white/[0.025]">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtDateTime(l.createdAt, locale)}</td>
                    <td className="px-3 py-2 text-xs font-medium">{l.modelName}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{l.provider}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{l.inputTokens.toLocaleString(locale)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{l.outputTokens.toLocaleString(locale)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{l.totalTokens.toLocaleString(locale)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-red-500">{toks(l.totalCost, locale, 6)}</td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={l.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setDetail(l)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        {t("detailButton")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-start justify-between gap-3 text-xs sm:flex-row sm:items-center">
          <span className="text-muted-foreground">
            {t("paginationInfo", { total: total.toLocaleString(locale), page, totalPages })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="border px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-40"
            >
              ← {t("paginationPrev")}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="border px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-40"
            >
              {t("paginationNext")} →
            </button>
          </div>
        </div>
      </section>

      {/* Detail modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setDetail(null)}
        >
          <div
            className="glass w-full max-w-md space-y-4 rounded-2xl p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">{t("detailEyebrow")}</div>
                <h3 className="mt-1 font-semibold">{t("detailTitle")}</h3>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <DetailRow label={t("colTime")} value={fmtDateTime(detail.createdAt, locale)} />
              <DetailRow label={t("colModel")} value={detail.modelName} />
              <DetailRow label={t("colProvider")} value={detail.provider} />
              <DetailRow label={t("colStatus")} value={<StatusBadge status={detail.status} />} />
              <DetailRow label={t("detailInputTokens")} value={detail.inputTokens.toLocaleString(locale)} mono />
              <DetailRow label={t("detailOutputTokens")} value={detail.outputTokens.toLocaleString(locale)} mono />
              <DetailRow label={t("colTotalTokens")} value={detail.totalTokens.toLocaleString(locale)} mono />
              <DetailRow
                label={t("colTotalCost")}
                value={`${toks(detail.totalCost, locale, 6)} ${TOKS_LABEL}`}
                mono
                accent="text-red-500"
              />
              <DetailRow
                label={t("detailRemainingAfter")}
                value={`${toks(detail.remainingBalance, locale)} ${TOKS_LABEL}`}
                mono
                accent="text-green-500"
              />
            </dl>
            <p className="text-[10px] text-muted-foreground border-t pt-2">
              {t("detailPrivacyNote")}
            </p>
          </div>
        </div>
      )}

      {summary && summary.balance <= 0 && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-center">
          <p className="text-sm text-red-500 font-medium">
            {t("insufficientCredit")}
          </p>
          <Link
            href="/dashboard/wallet"
            className="inline-block mt-2 bg-foreground text-background px-4 py-2 rounded-md text-xs font-medium hover:opacity-90"
          >
            {t("topUpCredit")}
          </Link>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent, tone }: { label: string; value: string; accent?: string; tone?: "accent" }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 sm:p-5 ${tone === "accent" ? "border-accent/20 bg-accent/[0.055]" : "border-white/[0.08] bg-white/[0.02]"}`}>
      <div className="mb-5 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</div>
        <span className={`h-1.5 w-1.5 rounded-full ${tone === "accent" ? "bg-accent shadow-[0_0_10px_var(--accent-glow)]" : "bg-white/25"}`} />
      </div>
      <div className={`text-xl font-semibold tracking-tight ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={`${mono ? "font-mono" : ""} ${accent ?? ""} text-sm text-right`}>{value}</dd>
    </div>
  );
}
