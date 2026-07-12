"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TOKS_LABEL, idrToToks } from "@/app/lib/constants";
import type { AdminApiKeyView, AdminKeyAnalytics } from "@/app/lib/admin-api-keys";

function toks(idr: number, max = 4): string {
  return idrToToks(idr).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  });
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function AdminApiKeysClient({
  keys: initialKeys,
  analytics,
}: {
  keys: AdminApiKeyView[];
  analytics: AdminKeyAnalytics;
}) {
  const router = useRouter();
  const [keys, setKeys] = useState<AdminApiKeyView[]>(initialKeys);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function toggle(keyId: string, enabled: boolean) {
    setBusyId(keyId);
    try {
      const res = await fetch(`/api/admin/keys/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setKeys((ks) => ks.map((k) => (k.id === keyId ? { ...k, enabled } : k)));
      } else {
        alert(data.error || "Failed");
      }
    } catch {
      alert("Connection failed");
    }
    setBusyId(null);
  }

  async function removeKey(keyId: string, name: string, email: string) {
    if (!confirm(`Delete key "${name}" (${email})? This removes all its usage history.`)) return;
    setBusyId(keyId);
    try {
      const res = await fetch(`/api/admin/keys/${keyId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setKeys((ks) => ks.filter((k) => k.id !== keyId));
        router.refresh();
      } else {
        alert(data.error || "Failed");
      }
    } catch {
      alert("Connection failed");
    }
    setBusyId(null);
  }

  const filtered = keys.filter((k) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      k.name.toLowerCase().includes(q) ||
      k.userEmail.toLowerCase().includes(q) ||
      (k.prefix ?? "").toLowerCase().includes(q) ||
      (k.last4 ?? "").toLowerCase().includes(q)
    );
  });

  const t = analytics.totals;

  return (
    <div className="space-y-6">
      {/* Overview metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Total Keys" value={t.totalKeys.toLocaleString("id-ID")} accent="text-teal-400" />
        <Metric label="Active Keys" value={t.activeKeys.toLocaleString("id-ID")} accent="text-emerald-400" />
        <Metric label="Total Requests" value={t.totalRequests.toLocaleString("id-ID")} accent="text-cyan-400" />
        <Metric label="API Revenue" value={`${toks(t.totalRevenue)} ${TOKS_LABEL}`} accent="text-emerald-400" />
        <Metric label="Total Tokens" value={t.totalTokens.toLocaleString("id-ID")} accent="text-blue-400" />
        <Metric label="Failed Requests" value={t.failedRequests.toLocaleString("id-ID")} accent="text-red-400" />
        <Metric label="Disabled Keys" value={t.disabledKeys.toLocaleString("id-ID")} accent="text-yellow-400" />
        <Metric label="Avg Response" value={`${t.avgResponseTime}ms`} />
      </div>

      {/* Top API users */}
      <Section title="Top API Users">
        <Table
          head={["User", "Keys", "Requests", "Tokens", "Revenue"]}
          empty="No data"
          rows={analytics.topUsers.map((u) => [
            u.email,
            u.keyCount.toLocaleString("id-ID"),
            u.requests.toLocaleString("id-ID"),
            u.totalTokens.toLocaleString("id-ID"),
            `${toks(u.totalCost)} ${TOKS_LABEL}`,
          ])}
        />
      </Section>

      {/* Revenue by key */}
      <Section title="Revenue by API Key">
        <Table
          head={["Key", "User", "Requests", "Tokens", "Revenue"]}
          empty="No data"
          rows={analytics.revenueByKey.map((r) => [
            r.keyName,
            r.userEmail,
            r.requests.toLocaleString("id-ID"),
            r.totalTokens.toLocaleString("id-ID"),
            `${toks(r.totalCost)} ${TOKS_LABEL}`,
          ])}
        />
      </Section>

      {/* Token usage by key */}
      <Section title="Token Usage by API Key">
        <Table
          head={["Key", "User", "Input", "Output", "Total"]}
          empty="No data"
          rows={analytics.tokenUsageByKey.map((r) => [
            r.keyName,
            r.userEmail,
            r.inputTokens.toLocaleString("id-ID"),
            r.outputTokens.toLocaleString("id-ID"),
            r.totalTokens.toLocaleString("id-ID"),
          ])}
        />
      </Section>

      {/* All keys table */}
      <Section title={`All API Keys (${keys.length})`}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, prefix…"
          className="w-full mb-3 px-3 py-2 border border-neutral-700 rounded-md bg-neutral-950 text-sm text-neutral-200"
        />
        <div className="border border-neutral-800 rounded-lg overflow-x-auto bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Key</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">User</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Created</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Last Used</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-neutral-500 text-sm">
                    No keys
                  </td>
                </tr>
              ) : (
                filtered.map((k) => {
                  const revoked = !k.isActive;
                  return (
                    <tr key={k.id} className="hover:bg-neutral-800/50 transition">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-neutral-200 text-xs">{k.name}</div>
                        <code className="text-[10px] font-mono text-neutral-500">{k.maskedKey}</code>
                      </td>
                      <td className="px-3 py-2.5 text-neutral-300 text-xs">{k.userEmail}</td>
                      <td className="px-3 py-2.5">
                        {revoked ? (
                          <Badge cls="bg-red-500/15 text-red-400">Revoked</Badge>
                        ) : k.isExpired ? (
                          <Badge cls="bg-red-500/15 text-red-400">Expired</Badge>
                        ) : k.enabled ? (
                          <Badge cls="bg-green-500/15 text-green-400">Active</Badge>
                        ) : (
                          <Badge cls="bg-gray-500/15 text-gray-400">Disabled</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-neutral-500 text-xs whitespace-nowrap">{fmt(k.createdAt)}</td>
                      <td className="px-3 py-2.5 text-neutral-500 text-xs whitespace-nowrap">
                        {k.lastUsedAt ? fmt(k.lastUsedAt) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1.5">
                          {k.enabled ? (
                            <button
                              onClick={() => toggle(k.id, false)}
                              disabled={busyId === k.id || revoked}
                              className="border border-neutral-700 px-2 py-1 rounded text-[11px] text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
                            >
                              Disable
                            </button>
                          ) : (
                            <button
                              onClick={() => toggle(k.id, true)}
                              disabled={busyId === k.id || revoked}
                              className="border border-neutral-700 px-2 py-1 rounded text-[11px] text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
                            >
                              Enable
                            </button>
                          )}
                          <button
                            onClick={() => removeKey(k.id, k.name, k.userEmail)}
                            disabled={busyId === k.id}
                            className="border border-red-500/40 text-red-400 px-2 py-1 rounded text-[11px] hover:bg-red-500/10 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Abuse monitor */}
      <Section title="Recent Failed Requests (Abuse Monitor)">
        <div className="border border-neutral-800 rounded-lg overflow-x-auto bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Time</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">User</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Key</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Endpoint</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Model</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {analytics.recentAbuse.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-neutral-500 text-sm">
                    No failed requests
                  </td>
                </tr>
              ) : (
                analytics.recentAbuse.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-3 py-2.5 text-neutral-400 text-xs whitespace-nowrap">{fmt(r.createdAt)}</td>
                    <td className="px-3 py-2.5 text-neutral-300 text-xs">{r.userEmail}</td>
                    <td className="px-3 py-2.5 text-neutral-400 text-xs">{r.keyName}</td>
                    <td className="px-3 py-2.5 text-neutral-400 text-xs font-mono">{r.endpoint}</td>
                    <td className="px-3 py-2.5 text-neutral-400 text-xs">{r.model}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                        {r.statusCode}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-500 text-xs font-mono">{r.clientIp ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 ${accent ?? "text-neutral-200"}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{children}</span>
  );
}

function Table({
  head,
  rows,
  empty = "No data",
}: {
  head: string[];
  rows: (string | number)[][];
  empty?: string;
}) {
  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 border-b border-neutral-800">
          <tr>
            {head.map((h) => (
              <th key={h} className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={head.length} className="px-3 py-6 text-center text-neutral-500 text-sm">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="hover:bg-neutral-800/50 transition">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-3 py-2.5 text-xs ${j === 0 ? "text-neutral-200 font-medium" : "text-neutral-400"} ${
                      j >= 2 ? "font-mono" : ""
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
