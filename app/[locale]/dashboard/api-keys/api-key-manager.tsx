"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { TOKS_LABEL, idrToToks } from "@/app/lib/constants";
import type { ApiKeyView, ApiKeyStats } from "@/app/lib/api-keys";

type Stats = Record<string, ApiKeyStats>;

type ReqRow = {
  id: string;
  createdAt: string;
  apiKeyId: string;
  keyName: string;
  endpoint: string;
  method: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  totalCostToks: number;
  responseTime: number;
  statusCode: number;
  success: boolean;
};

type Filters = {
  apiKeyId: string;
  model: string;
  provider: string;
  status: string;
  from: string;
  to: string;
  search: string;
};

const PAGE_SIZE = 15;

function toks(idr: number, max = 4): string {
  return idrToToks(idr).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ success }: { success: boolean }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
        success ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"
      }`}
    >
      {success ? "Success" : "Failed"}
    </span>
  );
}

export function ApiKeyManager({
  initialKeys,
  modelOptions,
  providerOptions,
  enabledModels,
}: {
  initialKeys: ApiKeyView[];
  modelOptions: string[];
  providerOptions: string[];
  enabledModels: string[];
}) {
  const [keys, setKeys] = useState<ApiKeyView[]>(initialKeys);
  const [stats, setStats] = useState<Stats>({});
  const [remainingBalance, setRemainingBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    expiresAt: "",
    ipWhitelist: "",
    rateLimit: "",
    allowedModels: [] as string[],
  });

  // One-time plaintext reveal (create / regenerate)
  const [revealed, setRevealed] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Request history
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    apiKeyId: "",
    model: "",
    provider: "",
    status: "",
    from: "",
    to: "",
    search: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Block generation when the wallet has no credit. The server enforces this
  // too (402 insufficient_balance), so this is a UX hint, not the security
  // boundary. remainingBalance is null until /api/keys/usage resolves.
  const balanceBlocked = remainingBalance !== null && remainingBalance <= 0;

  const flash = (msg: string | null, isErr = false) => {
    if (isErr) {
      setError(msg);
      setInfo(null);
    } else {
      setInfo(msg);
      setError(null);
    }
    if (msg) setTimeout(() => { setError(null); setInfo(null); }, 4000);
  };

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setKeys(data.keys);
      }
    } catch {}
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/keys/usage", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setRemainingBalance(data.remainingBalance);
        }
      }
    } catch {}
  }, []);

  const buildQuery = useCallback((f: Filters, extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (f.apiKeyId) p.set("apiKeyId", f.apiKeyId);
    if (f.model) p.set("model", f.model);
    if (f.provider) p.set("provider", f.provider);
    if (f.status) p.set("status", f.status);
    if (f.search) p.set("search", f.search);
    if (f.from) p.set("from", new Date(f.from).toISOString());
    if (f.to) {
      const d = new Date(f.to);
      d.setHours(23, 59, 59, 999);
      p.set("to", d.toISOString());
    }
    if (extra) for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return p.toString();
  }, []);

  const loadLogs = useCallback(async (f: Filters, p: number) => {
    setLoadingLogs(true);
    try {
      const q = buildQuery(f, { page: String(p), pageSize: String(PAGE_SIZE) });
      const res = await fetch(`/api/keys/requests?${q}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRows(data.rows);
          setTotal(data.total);
        }
      }
    } catch {}
    setLoadingLogs(false);
  }, [buildQuery]);

  const refreshAll = useCallback((f: Filters, p: number) => {
    loadKeys();
    loadStats();
    loadLogs(f, p);
  }, [loadKeys, loadStats, loadLogs]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadLogs(appliedFilters, page);
  }, [appliedFilters, page, loadLogs]);

  // After any key mutation, refresh keys + stats.
  const afterMutation = () => {
    loadKeys();
    loadStats();
  };

  async function createKey() {
    if (!form.name.trim()) {
      flash("Name is required", true);
      return;
    }
    if (balanceBlocked) {
      flash("Isi saldo terlebih dahulu untuk membuat API key.", true);
      return;
    }
    setBusy(true);
    try {
      const expiresAt = form.expiresAt || null;
      const rateLimit = form.rateLimit ? Number(form.rateLimit) : null;
      const ipWhitelist = form.ipWhitelist
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          expiresAt,
          ipWhitelist,
          rateLimit,
          allowedModels: form.allowedModels,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRevealed({ name: data.key.name, key: data.plaintext });
        setShowCreate(false);
        setForm({ name: "", expiresAt: "", ipWhitelist: "", rateLimit: "", allowedModels: [] });
        afterMutation();
        flash("API key created. Copy it now — shown only once.");
      } else {
        flash(data.error || "Failed", true);
      }
    } catch {
      flash("Connection failed", true);
    }
    setBusy(false);
  }

  async function regenerate(keyId: string, name: string) {
    if (!confirm(`Regenerate "${name}"? The old key will stop working immediately.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/keys/${keyId}/regenerate`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setRevealed({ name: data.key.name, key: data.plaintext });
        afterMutation();
        flash("Key regenerated. Copy the new key — shown only once.");
      } else {
        flash(data.error || "Failed", true);
      }
    } catch {
      flash("Connection failed", true);
    }
    setBusy(false);
  }

  async function setEnabled(keyId: string, enabled: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/keys/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (data.success) {
        afterMutation();
        flash(enabled ? "Key enabled" : "Key disabled");
      } else {
        flash(data.error || "Failed", true);
      }
    } catch {
      flash("Connection failed", true);
    }
    setBusy(false);
  }

  async function removeKey(keyId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone. All usage history is removed.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/keys/${keyId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        afterMutation();
        flash("Key deleted");
      } else {
        flash(data.error || "Failed", true);
      }
    } catch {
      flash("Connection failed", true);
    }
    setBusy(false);
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function applyFilters() {
    setPage(1);
    setAppliedFilters(filters);
  }

  function resetFilters() {
    const c: Filters = { apiKeyId: "", model: "", provider: "", status: "", from: "", to: "", search: "" };
    setFilters(c);
    setPage(1);
    setAppliedFilters(c);
  }

  return (
    <div className="space-y-6">
      {(info || error) && (
        <div
          className={`border rounded-md p-3 text-xs ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-600"
              : "border-green-500/30 bg-green-500/10 text-green-600"
          }`}
        >
          {error || info}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {keys.length} key{keys.length !== 1 ? "s" : ""}
          {remainingBalance !== null && (
            <> · {toks(remainingBalance)} {TOKS_LABEL} remaining</>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={busy || balanceBlocked}
          title={balanceBlocked ? "Isi saldo dulu untuk membuat API key" : undefined}
          className="bg-foreground text-background px-3 py-1.5 rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Generate Key
        </button>
      </div>

      {/* Zero-balance gate notice */}
      {balanceBlocked && (
        <div className="border border-red-500/30 bg-red-500/10 text-red-600 rounded-md p-3 text-xs flex items-center justify-between gap-3 flex-wrap">
          <span>Saldo Anda 0. Isi saldo terlebih dahulu untuk membuat atau regenerate API key.</span>
          <Link
            href="/dashboard/wallet"
            className="border border-red-500/40 px-3 py-1.5 rounded-md font-medium hover:bg-red-500/10"
          >
            Isi Saldo
          </Link>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No API keys yet. Generate one to start using the API.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => {
            const s = stats[k.id];
            const disabled = !k.enabled;
            const revoked = !k.isActive;
            return (
              <div key={k.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{k.name}</span>
                      {revoked ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500">Revoked</span>
                      ) : k.isExpired ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500">Expired</span>
                      ) : disabled ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-500/15 text-gray-500">Disabled</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-500">Active</span>
                      )}
                    </div>
                    <code className="block text-xs font-mono mt-1.5 break-all text-muted-foreground">
                      {k.maskedKey}
                    </code>
                    <div className="text-[10px] text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Created {fmtDateTime(k.createdAt)}</span>
                      {k.expiresAt && <span>· Expires {fmtDateTime(k.expiresAt)}</span>}
                      {k.lastUsedAt && <span>· Last used {fmtDateTime(k.lastUsedAt)}</span>}
                      {k.rateLimit && <span>· Rate {k.rateLimit}/min</span>}
                      {k.ipWhitelist.length > 0 && <span>· IP whitelist ({k.ipWhitelist.length})</span>}
                      {k.allowedModels.length > 0 && <span>· Models: {k.allowedModels.join(", ")}</span>}
                    </div>
                    {k.billingMode === "TOKEN_PACKAGE" && (
                      <div className="mt-3 rounded-lg border border-accent/20 bg-accent/[0.05] p-3">
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="font-medium text-accent">Paket token</span>
                          <span className="font-mono text-muted-foreground">
                            {k.remainingTokens.toLocaleString("id-ID")} / {k.tokenQuota.toLocaleString("id-ID")} tersisa
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${k.tokenQuota > 0 ? Math.max(0, Math.min(100, (k.remainingTokens / k.tokenQuota) * 100)) : 0}%` }}
                          />
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          Base URL: <code className="text-foreground">https://9inference.cloud/v1/package</code>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      onClick={() => regenerate(k.id, k.name)}
                      disabled={busy || balanceBlocked}
                      title={balanceBlocked ? "Isi saldo dulu untuk regenerate" : undefined}
                      className="border px-2 py-1 rounded text-[11px] hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Regenerate
                    </button>
                    {k.enabled ? (
                      <button
                        onClick={() => setEnabled(k.id, false)}
                        disabled={busy || revoked}
                        className="border px-2 py-1 rounded text-[11px] hover:bg-muted disabled:opacity-40"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => setEnabled(k.id, true)}
                        disabled={busy || revoked}
                        className="border px-2 py-1 rounded text-[11px] hover:bg-muted disabled:opacity-40"
                      >
                        Enable
                      </button>
                    )}
                    <button
                      onClick={() => removeKey(k.id, k.name)}
                      disabled={busy}
                      className="border border-red-500/40 text-red-600 px-2 py-1 rounded text-[11px] hover:bg-red-500/10 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Per-key stats */}
                {s && (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3 pt-3 border-t">
                    <Stat label="Requests" value={s.totalRequests.toLocaleString("id-ID")} />
                    <Stat label="Total Tokens" value={s.totalTokens.toLocaleString("id-ID")} />
                    <Stat label="Credits Spent" value={`${toks(s.totalCost)} ${TOKS_LABEL}`} accent="text-red-500" />
                    <Stat label="Success Rate" value={`${s.successRate.toFixed(1)}%`} accent={s.successRate >= 95 ? "text-green-500" : "text-yellow-600"} />
                    <Stat label="Avg Time" value={`${s.avgResponseTime}ms`} />
                    <Stat label="Last Used" value={s.lastUsedAt ? fmtDateTime(s.lastUsedAt) : "—"} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Request history */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Request History
        </h2>

        <div className="border rounded-lg p-3 mb-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
          <FilterField label="API Key">
            <select
              value={filters.apiKeyId}
              onChange={(e) => setFilters((f) => ({ ...f, apiKeyId: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            >
              <option value="">All</option>
              {keys.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Model">
            <select
              value={filters.model}
              onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            >
              <option value="">All</option>
              {modelOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Provider">
            <select
              value={filters.provider}
              onChange={(e) => setFilters((f) => ({ ...f, provider: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            >
              <option value="">All</option>
              {providerOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Status">
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </FilterField>
          <FilterField label="From">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            />
          </FilterField>
          <FilterField label="To">
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            />
          </FilterField>
          <FilterField label="Search">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="model, ip…"
              className="w-full px-2 py-1.5 border rounded-md bg-background text-xs"
            />
          </FilterField>
          <div className="col-span-2 md:col-span-4 lg:col-span-7 flex gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 bg-foreground text-background px-3 py-1.5 rounded-md text-xs font-medium hover:opacity-90"
            >
              Apply
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
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Date</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">API Key</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Endpoint</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Model</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Provider</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">In</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Out</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Total</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Cost</th>
                <th className="text-center px-3 py-2 font-medium text-xs text-muted-foreground">Status</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingLogs ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground text-sm">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground text-sm">No requests</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{r.keyName}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{r.endpoint}</td>
                    <td className="px-3 py-2 text-xs font-medium">{r.model}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.provider}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{r.inputTokens.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{r.outputTokens.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{r.totalTokens.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-red-500">{toks(r.totalCost, 6)}</td>
                    <td className="px-3 py-2 text-center"><StatusBadge success={r.success} /></td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{r.responseTime}ms</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs">
          <span className="text-muted-foreground">
            {total.toLocaleString("id-ID")} total · Page {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loadingLogs}
              className="border px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loadingLogs}
              className="border px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Generate New API Key" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Production, Development, Discord Bot…"
                className="w-full px-2.5 py-1.5 border rounded-md bg-background text-sm"
                maxLength={60}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Expiration (optional)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border rounded-md bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Rate limit /min (optional)</label>
                <input
                  type="number"
                  value={form.rateLimit}
                  onChange={(e) => setForm((f) => ({ ...f, rateLimit: e.target.value }))}
                  placeholder="60"
                  className="w-full px-2.5 py-1.5 border rounded-md bg-background text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">IP whitelist (optional, comma/newline)</label>
              <textarea
                value={form.ipWhitelist}
                onChange={(e) => setForm((f) => ({ ...f, ipWhitelist: e.target.value }))}
                placeholder="203.0.113.10, 198.51.100.5"
                rows={2}
                className="w-full px-2.5 py-1.5 border rounded-md bg-background text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Allowed models (optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {enabledModels.map((m) => {
                  const checked = form.allowedModels.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          allowedModels: checked
                            ? f.allowedModels.filter((x) => x !== m)
                            : [...f.allowedModels, m],
                        }))
                      }
                      className={`text-[11px] px-2 py-1 rounded-md border transition ${
                        checked ? "bg-foreground text-background" : "hover:bg-muted"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Leave empty to allow all enabled models.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="border px-3 py-1.5 rounded-md text-xs hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={createKey}
                disabled={busy}
                className="bg-foreground text-background px-4 py-1.5 rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* One-time reveal modal */}
      {revealed && (
        <Modal title="Your API Key — Copy Now" onClose={() => setRevealed(null)}>
          <div className="space-y-3">
            <div className="border border-yellow-500/40 bg-yellow-500/10 rounded-md p-3 text-xs text-yellow-700">
              This is the only time the full key will be shown. Store it securely.
              You will not be able to see it again.
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{revealed.name}</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono break-all border rounded-md px-2.5 py-2 bg-muted/30">
                  {revealed.key}
                </code>
                <button
                  onClick={() => copyText(revealed.key)}
                  className="border px-3 py-2 rounded-md text-xs hover:bg-muted shrink-0"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setRevealed(null)}
                className="bg-foreground text-background px-4 py-1.5 rounded-md text-xs font-medium hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border rounded-xl p-5 max-w-lg w-full space-y-3 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
