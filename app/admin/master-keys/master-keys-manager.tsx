"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MasterKeyView = {
  id: string;
  label: string;
  maskedKey: string;
  prefix: string | null;
  last4: string | null;
  priority: number;
  enabled: boolean;
  lastUsedAt: string | null;
  lastErrorAt: string | null;
  lastErrorStatus: number | null;
  lastErrorMsg: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditLogView = {
  id: string;
  actorUserId: string | null;
  action: string;
  target: string | null;
  createdAt: string;
};

export function MasterKeysManager({
  initialKeys,
  initialAuditLogs,
}: {
  initialKeys: MasterKeyView[];
  initialAuditLogs: AuditLogView[];
}) {
  const router = useRouter();
  const [keys, setKeys] = useState<MasterKeyView[]>(initialKeys);
  const [auditLogs, setAuditLogs] = useState<AuditLogView[]>(initialAuditLogs);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newPriority, setNewPriority] = useState("0");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function fmtDate(s: string | null): string {
    if (!s) return "—";
    return new Date(s).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
  }

  function statusLabel(k: MasterKeyView): { text: string; cls: string } {
    if (!k.enabled) return { text: "Disabled", cls: "text-neutral-500 border-neutral-700 bg-neutral-800/50" };
    if (k.lastErrorAt) return { text: `Errored (${k.lastErrorStatus ?? "?"})`, cls: "text-red-400 border-red-500/30 bg-red-500/10" };
    return { text: "Active", cls: "text-green-400 border-green-500/30 bg-green-500/10" };
  }

  async function refresh() {
    try {
      const [keysRes, logsRes] = await Promise.all([
        fetch("/api/admin/master-keys"),
        fetch("/api/admin/audit-logs"),
      ]);
      const keysData = (await keysRes.json()) as { success: boolean; keys?: MasterKeyView[] };
      const logsData = (await logsRes.json()) as { success: boolean; logs?: AuditLogView[] };
      if (keysData.success && keysData.keys) setKeys(keysData.keys);
      if (logsData.success && logsData.logs) setAuditLogs(logsData.logs);
    } catch {
      // ignore
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/master-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plaintext: newKey.trim(),
          label: newLabel.trim(),
          priority: parseInt(newPriority) || 0,
        }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg("Master key ditambahkan");
        setNewLabel("");
        setNewKey("");
        setNewPriority("0");
        setShowAdd(false);
        await refresh();
        router.refresh();
      } else {
        setError(data.error || "Gagal menambahkan");
      }
    } catch {
      setError("Koneksi gagal");
    }
    setSaving(false);
    setTimeout(() => {
      setMsg(null);
      setError(null);
    }, 3500);
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/admin/master-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        await refresh();
      } else {
        setError(data.error || "Gagal");
      }
    } catch {
      setError("Koneksi gagal");
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Hapus master key "${label}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/admin/master-keys/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        await refresh();
        router.refresh();
      } else {
        setError(data.error || "Gagal menghapus");
      }
    } catch {
      setError("Koneksi gagal");
    }
  }

  async function handlePriority(id: string, direction: "up" | "down") {
    const key = keys.find((k) => k.id === id);
    if (!key) return;
    const newPriority = direction === "up" ? key.priority - 1 : key.priority + 1;
    try {
      const res = await fetch(`/api/admin/master-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: Math.max(0, newPriority) }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        await refresh();
      } else {
        setError(data.error || "Gagal");
      }
    } catch {
      setError("Koneksi gagal");
    }
  }

  return (
    <div className="space-y-4">
      {msg && <div className="text-xs text-green-400">{msg}</div>}
      {error && <div className="text-xs text-red-400">{error}</div>}

      {/* Key list */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-300">Master Keys ({keys.length})</h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-neutral-100 text-neutral-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-neutral-300 transition"
          >
            {showAdd ? "Batal" : "+ Tambah Key"}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="p-4 border-b border-neutral-800 space-y-3 bg-neutral-950/50">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="contoh: Primary upstream key"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Master Key (plaintext)</label>
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
              />
              <p className="text-[10px] text-neutral-600 mt-1">
                Dienkripsi AES-256-GCM saat disimpan. Plaintext tidak pernah dikembalikan setelah ini.
              </p>
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Priority (lower = tried first)</label>
              <input
                type="number"
                min={0}
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-32 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
            >
              {saving ? "Menyimpan..." : "Tambah & Enkripsi"}
            </button>
          </form>
        )}

        {keys.length === 0 ? (
          <div className="p-6 text-center text-neutral-500 text-sm">
            Belum ada master key. Tambahkan key baru atau gunakan env MASTER_API_KEY sebagai fallback.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-neutral-500 text-xs">Label</th>
                <th className="text-left px-3 py-2 font-medium text-neutral-500 text-xs">Key</th>
                <th className="text-left px-3 py-2 font-medium text-neutral-500 text-xs">Priority</th>
                <th className="text-left px-3 py-2 font-medium text-neutral-500 text-xs">Status</th>
                <th className="text-left px-3 py-2 font-medium text-neutral-500 text-xs">Last Used</th>
                <th className="text-left px-3 py-2 font-medium text-neutral-500 text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {keys.map((k) => {
                const status = statusLabel(k);
                return (
                  <tr key={k.id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-3 py-2.5 text-neutral-200 text-xs">{k.label}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-neutral-400">{k.maskedKey}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-neutral-300">{k.priority}</span>
                        <button
                          onClick={() => handlePriority(k.id, "up")}
                          className="text-neutral-600 hover:text-neutral-300 text-[10px] px-1"
                          title="Priority naik"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handlePriority(k.id, "down")}
                          className="text-neutral-600 hover:text-neutral-300 text-[10px] px-1"
                          title="Priority turun"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.cls}`}>
                        {status.text}
                      </span>
                      {k.lastErrorMsg && (
                        <div className="text-[10px] text-red-400/70 mt-1 max-w-xs truncate" title={k.lastErrorMsg}>
                          {k.lastErrorMsg}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-500 text-[10px]">{fmtDate(k.lastUsedAt)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(k.id, k.enabled)}
                          className={`text-xs px-2 py-1 rounded transition ${
                            k.enabled
                              ? "border border-neutral-700 text-neutral-400 hover:bg-neutral-800"
                              : "border border-green-700 text-green-400 hover:bg-green-950/50"
                          }`}
                        >
                          {k.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDelete(k.id, k.label)}
                          className="text-xs px-2 py-1 rounded border border-red-800 text-red-400 hover:bg-red-950/50 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Audit log */}
      {auditLogs.length > 0 && (
        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
          <div className="p-3 border-b border-neutral-800">
            <h2 className="text-sm font-medium text-neutral-300">Audit Log</h2>
          </div>
          <div className="divide-y divide-neutral-800 max-h-60 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs text-neutral-300 font-mono">{log.action}</span>
                  {log.target && <span className="text-[10px] text-neutral-600 ml-2">{log.target.slice(0, 12)}…</span>}
                </div>
                <span className="text-[10px] text-neutral-600 shrink-0">{fmtDate(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
