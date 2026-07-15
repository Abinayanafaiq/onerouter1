"use client";

import { useCallback, useEffect, useState } from "react";
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

function toks(idr: number, max = 4): string {
  return idrToToks(idr).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    success: { cls: "bg-green-500/15 text-green-500", label: "Success" },
    rejected: { cls: "bg-yellow-500/15 text-yellow-600", label: "Rejected" },
    error: { cls: "bg-red-500/15 text-red-500", label: "Error" },
  };
  const s = map[status] || { cls: "bg-gray-500/15 text-gray-500", label: status };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>
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
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {title}
      </h3>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Belum ada data</p>
      ) : (
        <div className="space-y-2.5">
          {data.map((d, i) => (
            <div key={d.label}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="truncate max-w-[60%]" title={d.label}>{d.label}</span>
                <span className="font-mono text-muted-foreground">
                  {d.value.toLocaleString("id-ID", { maximumFractionDigits: 4 })} {unit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Saldo Kredit"
          value={summary ? `${summary.balanceToks.toLocaleString("id-ID", { maximumFractionDigits: 4 })} ${TOKS_LABEL}` : "…"}
          accent={summary && summary.balance <= 0 ? "text-red-500" : "text-green-500"}
        />
        <MetricCard
          label="Total Terpakai"
          value={summary ? `${toks(summary.totalUsed)} ${TOKS_LABEL}` : "…"}
        />
        <MetricCard
          label="Total Request"
          value={summary ? summary.totalRequests.toLocaleString("id-ID") : "…"}
        />
        <MetricCard
          label="Estimasi Sisa Request"
          value={
            summary
              ? summary.estimatedRemainingRequests === null
                ? "—"
                : summary.estimatedRemainingRequests.toLocaleString("id-ID")
              : "…"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BarChart
          title="Usage by Model (requests)"
          data={modelRows.map((m) => ({ label: m.modelName, value: m.requests }))}
          unit="req"
        />
        <BarChart
          title="Cost by Model"
          data={modelRows.map((m) => ({ label: m.modelName, value: idrToToks(m.totalCost) }))}
          unit={TOKS_LABEL}
        />
        <BarChart
          title="Token Consumption by Model"
          data={modelRows.map((m) => ({ label: m.modelName, value: m.totalTokens }))}
          unit="tok"
        />
      </div>

      {/* Usage by model table */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Usage by Model
        </h2>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Model</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Provider</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Requests</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Input</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Output</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Total Token</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Total Cost</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Avg/Req</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {modelRows.map((m) => (
                <tr key={`${m.model}-${m.provider}`} className="hover:bg-muted/30 transition">
                  <td className="px-3 py-2 font-medium">{m.modelName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.provider}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{m.requests.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{m.inputTokens.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{m.outputTokens.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{m.totalTokens.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-red-500">{toks(m.totalCost)} {TOKS_LABEL}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{toks(m.avgCostPerRequest, 6)}</td>
                </tr>
              ))}
              {modelRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground text-sm">
                    Belum ada data pemakaian
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity history */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Activity History
        </h2>

        {/* Filters */}
        <div className="border rounded-lg p-3 mb-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Model</label>
            <select
              value={filters.model}
              onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            >
              <option value="">Semua</option>
              {modelOptions.map((m) => (
                <option key={m.model} value={m.model}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Provider</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters((f) => ({ ...f, provider: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            >
              <option value="">Semua</option>
              {providerOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            >
              <option value="">Semua</option>
              <option value="success">Success</option>
              <option value="rejected">Rejected</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 bg-foreground text-background px-3 py-1.5 rounded-md text-xs font-medium hover:opacity-90"
            >
              Terapkan
            </button>
            <button
              onClick={resetFilters}
              className="border px-3 py-1.5 rounded-md text-xs hover:bg-muted"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Waktu</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Model</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Provider</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Input</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Output</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Total</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Cost</th>
                <th className="text-center px-3 py-2 font-medium text-xs text-muted-foreground">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground text-sm">
                    Memuat…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground text-sm">
                    Belum ada aktivitas
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                    <td className="px-3 py-2 text-xs font-medium">{l.modelName}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{l.provider}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{l.inputTokens.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{l.outputTokens.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{l.totalTokens.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-red-500">{toks(l.totalCost, 6)}</td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={l.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setDetail(l)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3 text-xs">
          <span className="text-muted-foreground">
            {total.toLocaleString("id-ID")} total · Halaman {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="border px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-40"
            >
              ← Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="border px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-40"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-background border rounded-xl p-5 max-w-md w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Request Detail</h3>
              <button
                onClick={() => setDetail(null)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Timestamp" value={fmtDateTime(detail.createdAt)} />
              <DetailRow label="Model" value={detail.modelName} />
              <DetailRow label="Provider" value={detail.provider} />
              <DetailRow label="Status" value={<StatusBadge status={detail.status} />} />
              <DetailRow label="Input Tokens" value={detail.inputTokens.toLocaleString("id-ID")} mono />
              <DetailRow label="Output Tokens" value={detail.outputTokens.toLocaleString("id-ID")} mono />
              <DetailRow label="Total Tokens" value={detail.totalTokens.toLocaleString("id-ID")} mono />
              <DetailRow
                label="Total Cost"
                value={`${toks(detail.totalCost, 6)} ${TOKS_LABEL}`}
                mono
                accent="text-red-500"
              />
              <DetailRow
                label="Sisa Kredit Setelah Request"
                value={`${toks(detail.remainingBalance)} ${TOKS_LABEL}`}
                mono
                accent="text-green-500"
              />
            </dl>
            <p className="text-[10px] text-muted-foreground border-t pt-2">
              Isi prompt tidak disimpan demi privasi (kecuali diaktifkan oleh admin).
            </p>
          </div>
        </div>
      )}

      {summary && summary.balance <= 0 && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-center">
          <p className="text-sm text-red-500 font-medium">
            Insufficient credits. Please top up your wallet balance to continue using AI services.
          </p>
          <Link
            href="/dashboard/wallet"
            className="inline-block mt-2 bg-foreground text-background px-4 py-2 rounded-md text-xs font-medium hover:opacity-90"
          >
            Top Up Credits
          </Link>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold mt-1 ${accent ?? ""}`}>{value}</div>
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
