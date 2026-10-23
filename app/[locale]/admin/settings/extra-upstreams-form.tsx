"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UpstreamView = {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  map: Record<string, string>;
  apiKeySet: boolean;
};

type Row = { publicId: string; upstreamId: string };

type Draft = {
  /** Kosong untuk upstream baru yang belum disimpan. */
  id: string;
  label: string;
  url: string;
  apiKey: string;
  apiKeySet: boolean;
  enabled: boolean;
  rows: Row[];
};

function toDraft(u: UpstreamView): Draft {
  return {
    id: u.id,
    label: u.label,
    url: u.url,
    apiKey: "",
    apiKeySet: u.apiKeySet,
    enabled: u.enabled,
    rows: Object.entries(u.map).map(([publicId, upstreamId]) => ({ publicId, upstreamId })),
  };
}

function emptyDraft(): Draft {
  return {
    id: "",
    label: "",
    url: "",
    apiKey: "",
    apiKeySet: false,
    enabled: true,
    rows: [{ publicId: "", upstreamId: "" }],
  };
}

const inputCls =
  "px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded-md text-xs text-neutral-200 font-mono disabled:opacity-50";

export function ExtraUpstreamsForm({
  initialUpstreams,
  knownModels,
}: {
  initialUpstreams: UpstreamView[];
  knownModels: string[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>(initialUpstreams.map(toDraft));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function flash(text: string, isError = false) {
    if (isError) setError(text);
    else setMsg(text);
    setTimeout(() => {
      setMsg(null);
      setError(null);
    }, 4000);
  }

  function patchDraft(i: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function patchRow(i: number, r: number, field: keyof Row, value: string) {
    setDrafts((prev) =>
      prev.map((d, idx) =>
        idx === i
          ? { ...d, rows: d.rows.map((row, ri) => (ri === r ? { ...row, [field]: value } : row)) }
          : d,
      ),
    );
  }

  function removeUpstream(i: number) {
    const d = drafts[i];
    const name = d.label || `Upstream #${i + 2}`;
    if (d.id && !confirm(`Hapus ${name}? Model di dalamnya akan kembali lewat upstream master setelah disimpan.`)) return;
    setDrafts((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = [];
    for (const [i, d] of drafts.entries()) {
      const name = d.label.trim() || `Upstream #${i + 2}`;
      if (!/^https?:\/\/.+/.test(d.url.trim())) {
        flash(`${name}: URL harus diawali http:// atau https://`, true);
        return;
      }
      if (!d.apiKeySet && !d.apiKey.trim()) {
        flash(`${name}: API key wajib diisi`, true);
        return;
      }
      const map: Record<string, string> = {};
      for (const row of d.rows) {
        const key = row.publicId.trim();
        const value = row.upstreamId.trim();
        if (!key && !value) continue; // baris kosong diabaikan
        if (!key || !value) {
          flash(`${name}: semua baris model harus terisi lengkap (atau hapus baris kosong)`, true);
          return;
        }
        if (key in map) {
          flash(`${name}: model ID duplikat ${key}`, true);
          return;
        }
        map[key] = value;
      }
      payload.push({
        id: d.id || undefined,
        label: d.label.trim(),
        url: d.url.trim(),
        apiKey: d.apiKey.trim(),
        enabled: d.enabled,
        map,
      });
    }

    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/backup-upstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upstreams: payload }),
      });
      const data = (await res.json()) as { success: boolean; upstreams?: UpstreamView[]; error?: string };
      if (data.success && data.upstreams) {
        setDrafts(data.upstreams.map(toDraft));
        flash("Upstream tambahan disimpan");
        // Segarkan daftar prioritas (upstream baru/terhapus/ganti nama).
        router.refresh();
      } else {
        flash(data.error || "Gagal menyimpan", true);
      }
    } catch {
      flash("Koneksi gagal", true);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-neutral-300">Upstream Backup Tambahan</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Tambah upstream lain sebanyak yang dibutuhkan. Masing-masing punya URL, API key, dan
          daftar model sendiri. Model publik yang sama boleh ada di beberapa upstream — atur
          mana yang diutamakan di bagian Prioritas Upstream Backup. API key dienkripsi dan
          tidak ditampilkan lagi setelah disimpan.
        </p>
      </div>

      {drafts.length === 0 && (
        <div className="text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-md p-4 text-center">
          Belum ada upstream tambahan.
        </div>
      )}

      {drafts.map((d, i) => (
        <div key={d.id || `new-${i}`} className="border border-neutral-800 rounded-md p-3 space-y-3 bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-300">Upstream #{i + 2}</span>
            {!d.id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Belum disimpan</span>
            )}
            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-neutral-400">
              <input
                type="checkbox"
                checked={d.enabled}
                disabled={saving}
                onChange={(e) => patchDraft(i, { enabled: e.target.checked })}
              />
              Aktif
            </label>
            <button
              type="button"
              onClick={() => removeUpstream(i)}
              disabled={saving}
              className="text-[11px] px-2 py-0.5 rounded border border-red-800 text-red-400 hover:bg-red-950/50 disabled:opacity-50 transition"
            >
              Hapus upstream
            </button>
          </div>

          <div className="grid gap-2">
            <div>
              <label className="text-[10px] font-medium text-neutral-500 block mb-1">Nama (opsional)</label>
              <input
                type="text"
                value={d.label}
                maxLength={80}
                disabled={saving}
                onChange={(e) => patchDraft(i, { label: e.target.value })}
                placeholder="contoh: Provider B"
                className={`w-full ${inputCls} font-sans`}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-neutral-500 block mb-1">URL upstream</label>
              <input
                type="text"
                value={d.url}
                disabled={saving}
                onChange={(e) => patchDraft(i, { url: e.target.value })}
                placeholder="https://api.provider-lain.com/v1"
                className={`w-full ${inputCls}`}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-neutral-500 block mb-1">
                API key {d.apiKeySet && <span className="text-green-400">· tersimpan</span>}
              </label>
              <input
                type="password"
                value={d.apiKey}
                disabled={saving}
                autoComplete="new-password"
                onChange={(e) => patchDraft(i, { apiKey: e.target.value })}
                placeholder={d.apiKeySet ? "Kosongkan untuk tetap memakai key lama" : "sk-..."}
                className={`w-full ${inputCls}`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[10px] font-medium text-neutral-500 px-0.5">
              <span>Model ID publik</span>
              <span>Model ID di upstream ini</span>
              <span className="w-6" />
            </div>
            {d.rows.map((row, r) => (
              <div key={r} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  type="text"
                  value={row.publicId}
                  disabled={saving}
                  onChange={(e) => patchRow(i, r, "publicId", e.target.value)}
                  placeholder="glm-5.3"
                  list="extra-upstream-known-models"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={row.upstreamId}
                  disabled={saving}
                  onChange={(e) => patchRow(i, r, "upstreamId", e.target.value)}
                  placeholder="glm-5.3"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => patchDraft(i, { rows: d.rows.filter((_, ri) => ri !== r) })}
                  disabled={saving}
                  title="Hapus baris"
                  className="w-6 h-6 text-neutral-500 hover:text-red-400 disabled:opacity-50 transition text-sm leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patchDraft(i, { rows: [...d.rows, { publicId: "", upstreamId: "" }] })}
              disabled={saving}
              className="text-xs text-accent hover:underline disabled:opacity-50"
            >
              + Tambah model
            </button>
          </div>
        </div>
      ))}

      <datalist id="extra-upstream-known-models">
        {knownModels.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
        disabled={saving}
        className="w-full border border-dashed border-neutral-700 rounded-md py-2 text-xs text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 disabled:opacity-50 transition"
      >
        + Tambah upstream
      </button>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "Menyimpan..." : "Simpan semua upstream"}
        </button>
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </form>
  );
}
