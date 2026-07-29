"use client";

import { useState } from "react";
import type {
  AdminUserPackageStatus,
  AdminUserPackageView,
  AdminUserPackagesSummary,
} from "@/app/lib/admin-api-keys";

const STATUS_META: Record<AdminUserPackageStatus, { label: string; cls: string; bar: string }> = {
  active: { label: "Aktif", cls: "bg-green-500/15 text-green-400", bar: "bg-emerald-500" },
  depleted: { label: "Kuota Habis", cls: "bg-amber-500/15 text-amber-400", bar: "bg-amber-500" },
  expired: { label: "Kedaluwarsa", cls: "bg-red-500/15 text-red-400", bar: "bg-red-500" },
  disabled: { label: "Dinonaktifkan", cls: "bg-gray-500/15 text-gray-400", bar: "bg-neutral-600" },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function num(n: number): string {
  return n.toLocaleString("id-ID");
}

export function UserPackagesTable({
  packages,
  summary,
}: {
  packages: AdminUserPackageView[];
  summary: AdminUserPackagesSummary;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = packages.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.userEmail.toLowerCase().includes(q) ||
      p.maskedKey.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Overview metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Paket Terjual" value={num(summary.totalPackages)} />
        <Metric label="Paket Aktif" value={num(summary.activePackages)} accent="text-emerald-400" />
        <Metric label="Sisa Token (aktif)" value={num(summary.totalRemainingTokens)} accent="text-teal-400" />
        <Metric label="Token Terpakai" value={num(summary.totalUsedTokens)} accent="text-blue-400" />
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari email, nama paket, atau key…"
          className="flex-1 px-3 py-2 border border-neutral-700 rounded-md bg-neutral-950 text-sm text-neutral-200"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-neutral-700 rounded-md bg-neutral-950 text-sm text-neutral-200"
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="depleted">Kuota habis</option>
          <option value="expired">Kedaluwarsa</option>
          <option value="disabled">Dinonaktifkan</option>
        </select>
      </div>

      {/* Packages table */}
      <div className="border border-neutral-800 rounded-lg overflow-x-auto bg-neutral-900">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-neutral-900 border-b border-neutral-800">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Paket</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">User</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Sisa Token</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Request</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Status</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Berakhir</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Terakhir Dipakai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-neutral-500 text-sm">
                  Tidak ada paket yang cocok
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const meta = STATUS_META[p.status];
                const remaining = Math.max(0, p.tokenQuota - p.tokenUsed);
                return (
                  <tr key={p.id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-neutral-200 text-xs">{p.name}</div>
                      <code className="text-[10px] font-mono text-neutral-500">{p.maskedKey}</code>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-300 text-xs">{p.userEmail}</td>
                    <td className="px-3 py-2.5">
                      <div className="w-44">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-xs text-neutral-200">{num(remaining)}</span>
                          <span className="font-mono text-[10px] text-neutral-500">/ {num(p.tokenQuota)}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${meta.bar}`}
                            style={{ width: `${100 - p.usedPercent}%` }}
                          />
                        </div>
                        <div className="mt-0.5 text-[9px] text-neutral-500">
                          {p.usedPercent.toFixed(1)}% terpakai
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-neutral-400">{num(p.requestCount)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-500 text-xs whitespace-nowrap">
                      {p.expiresAt ? fmt(p.expiresAt) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-500 text-xs whitespace-nowrap">
                      {p.lastUsedAt ? fmt(p.lastUsedAt) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-neutral-600">
        Menampilkan {filtered.length} dari {packages.length} paket token.
      </p>
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
