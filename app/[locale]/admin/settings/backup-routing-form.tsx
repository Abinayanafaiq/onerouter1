"use client";

import { useState } from "react";

type RoutingMap = Record<string, string>;

type Row = { publicId: string; upstreamId: string };

function mapToRows(map: RoutingMap): Row[] {
  return Object.entries(map).map(([publicId, upstreamId]) => ({ publicId, upstreamId }));
}

export function BackupRoutingForm({
  initialMap,
  initialSource,
  knownModels,
}: {
  initialMap: RoutingMap;
  initialSource: "database" | "default";
  knownModels: string[];
}) {
  const [rows, setRows] = useState<Row[]>(mapToRows(initialMap));
  const [source, setSource] = useState(initialSource);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function flash(text: string, isError = false) {
    if (isError) setError(text);
    else setMsg(text);
    setTimeout(() => {
      setMsg(null);
      setError(null);
    }, 3500);
  }

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { publicId: "", upstreamId: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const map: RoutingMap = {};
    for (const row of rows) {
      const key = row.publicId.trim();
      const value = row.upstreamId.trim();
      if (!key && !value) continue; // baris kosong diabaikan
      if (!key || !value) {
        flash("Semua baris harus terisi lengkap (atau hapus baris kosong)", true);
        return;
      }
      if (key in map) {
        flash(`Model ID duplikat: ${key}`, true);
        return;
      }
      map[key] = value;
    }

    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/backup-routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ map }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setSource("database");
        flash("Routing backup disimpan");
      } else {
        flash(data.error || "Gagal menyimpan", true);
      }
    } catch {
      flash("Koneksi gagal", true);
    }
    setSaving(false);
  }

  async function handleReset() {
    if (!confirm("Reset routing backup ke default dari kode? Override di database akan dihapus.")) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/backup-routing", { method: "DELETE" });
      const data = (await res.json()) as { success: boolean; map?: RoutingMap; error?: string };
      if (data.success && data.map) {
        setRows(mapToRows(data.map));
        setSource("default");
        flash("Routing dikembalikan ke default");
      } else {
        flash(data.error || "Gagal reset", true);
      }
    } catch {
      flash("Koneksi gagal", true);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-300">Backup Upstream Routing</h2>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              source === "database"
                ? "bg-accent/15 text-accent"
                : "bg-neutral-800 text-neutral-500"
            }`}
          >
            {source === "database" ? "Override database" : "Default (kode)"}
          </span>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
          Model publik di kolom kiri akan dialihkan ke backup upstream (BACKUP_API_URL) memakai
          model ID di kolom kanan. Model yang tidak tercantum tetap lewat upstream master.
          Butuh BACKUP_API_KEY di environment agar aktif.
        </p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[10px] font-medium text-neutral-500 px-0.5">
          <span>Model ID publik</span>
          <span>Model ID di backup upstream</span>
          <span className="w-6" />
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input
              type="text"
              value={row.publicId}
              onChange={(e) => updateRow(i, "publicId", e.target.value)}
              placeholder="deepseek-v4.1-flash"
              list="backup-routing-known-models"
              className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded-md text-xs text-neutral-200 font-mono"
            />
            <input
              type="text"
              value={row.upstreamId}
              onChange={(e) => updateRow(i, "upstreamId", e.target.value)}
              placeholder="deepseek-v4.1-flash"
              className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded-md text-xs text-neutral-200 font-mono"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={saving}
              title="Hapus baris"
              className="w-6 h-6 text-neutral-500 hover:text-red-400 disabled:opacity-50 transition text-sm leading-none"
            >
              ×
            </button>
          </div>
        ))}
        <datalist id="backup-routing-known-models">
          {knownModels.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={addRow}
          disabled={saving}
          className="text-xs text-accent hover:underline disabled:opacity-50"
        >
          + Tambah model
        </button>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {source === "database" && (
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="border border-red-800 text-red-400 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-950/50 disabled:opacity-50 transition"
          >
            Reset ke Default
          </button>
        )}
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </form>
  );
}
