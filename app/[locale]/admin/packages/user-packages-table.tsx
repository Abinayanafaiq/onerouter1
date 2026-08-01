"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expand, setExpand] = useState<{ id: string; mode: "extend" | "quota" } | null>(null);
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function doAction(id: string, payload: Record<string, unknown>): Promise<boolean> {
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/user-packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Gagal memproses aksi");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setErrorMsg("Koneksi gagal");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(p: AdminUserPackageView) {
    if (p.enabled && !window.confirm(`Matikan paket "${p.name}" milik ${p.userEmail}? User tidak akan bisa memakai key ini.`)) {
      return;
    }
    await doAction(p.id, { action: "setEnabled", enabled: !p.enabled });
  }

  function openExpand(p: AdminUserPackageView, mode: "extend" | "quota") {
    setErrorMsg(null);
    setAmount("");
    setExpand((cur) => (cur && cur.id === p.id && cur.mode === mode ? null : { id: p.id, mode }));
  }

  async function handleExpandSubmit(p: AdminUserPackageView) {
    const n = parseInt(amount, 10);
    if (!Number.isInteger(n) || n < 1) {
      setErrorMsg(expand?.mode === "extend" ? "Jumlah hari harus bilangan bulat >= 1" : "Jumlah token harus bilangan bulat >= 1");
      return;
    }
    const ok = await doAction(
      p.id,
      expand?.mode === "extend" ? { action: "extend", days: n } : { action: "addQuota", tokens: n },
    );
    if (ok) {
      setExpand(null);
      setAmount("");
    }
  }

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
        <table className="w-full text-sm min-w-[1020px]">
          <thead className="bg-neutral-900 border-b border-neutral-800">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Paket</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">User</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Sisa Token</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Request</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Status</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Berakhir</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Terakhir Dipakai</th>
              <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-neutral-500 text-sm">
                  Tidak ada paket yang cocok
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const meta = STATUS_META[p.status];
                const remaining = Math.max(0, p.tokenQuota - p.tokenUsed);
                const isBusy = busyId === p.id;
                const expanded = expand?.id === p.id ? expand : null;
                return (
                  <Fragment key={p.id}>
                    <tr className="hover:bg-neutral-800/50 transition">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-neutral-200 text-xs">{p.name}</div>
                        <code className="text-[10px] font-mono text-neutral-500">{p.maskedKey}</code>
                        {p.allowedModels.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {p.allowedModels.map((m) => (
                              <span
                                key={m}
                                className="text-[9px] px-1 py-px rounded bg-amber-900/40 text-amber-400 font-mono"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
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
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openExpand(p, "extend")}
                            className={`rounded-md border px-2 py-1 text-[10px] font-medium transition disabled:opacity-50 ${
                              expanded?.mode === "extend"
                                ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                                : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                            }`}
                          >
                            + Masa Aktif
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openExpand(p, "quota")}
                            className={`rounded-md border px-2 py-1 text-[10px] font-medium transition disabled:opacity-50 ${
                              expanded?.mode === "quota"
                                ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                                : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                            }`}
                          >
                            + Kuota
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggle(p)}
                            className={`rounded-md border px-2 py-1 text-[10px] font-medium transition disabled:opacity-50 ${
                              p.enabled
                                ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                                : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                          >
                            {isBusy ? "…" : p.enabled ? "Matikan" : "Aktifkan"}
                          </button>
                        </div>
                        {errorMsg && busyId === null && expand?.id !== p.id && (
                          <div className="mt-1.5 text-[10px] text-red-400 max-w-[180px]">{errorMsg}</div>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-neutral-950/60">
                        <td colSpan={8} className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-neutral-400">
                              {expanded.mode === "extend"
                                ? `Tambah masa aktif "${p.name}" (hari):`
                                : `Tambah kuota "${p.name}" (token):`}
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder={expanded.mode === "extend" ? "mis. 7" : "mis. 1000000"}
                              className="w-36 px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-xs text-neutral-200"
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleExpandSubmit(p)}
                              className="rounded-md bg-teal-500/90 px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-teal-400 disabled:opacity-50"
                            >
                              {isBusy ? "Memproses…" : "Terapkan"}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => { setExpand(null); setErrorMsg(null); }}
                              className="rounded-md border border-neutral-700 px-3 py-1.5 text-[11px] text-neutral-400 transition hover:border-neutral-500"
                            >
                              Batal
                            </button>
                            {expanded.mode === "extend" && p.expiresAt && (
                              <span className="text-[10px] text-neutral-600">
                                Berakhir saat ini: {fmt(p.expiresAt)}
                                {p.isExpired ? " (sudah lewat — perpanjangan dihitung dari sekarang)" : ""}
                              </span>
                            )}
                            {errorMsg && <span className="text-[11px] text-red-400">{errorMsg}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
