"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm font-mono text-neutral-200";

/**
 * Form tambah model paket baru (katalog /v1/package). Model yang dibuat di
 * sini langsung tampil di halaman "Paket Saya" user dan bisa dipakai key
 * paket — pastikan upstreamId-nya benar-benar ada di upstream.
 */
export function PackageModelCreator() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    modelId: "",
    upstreamId: "",
    name: "",
    provider: "WeizeRouter",
    sort: "0",
    supportsStreaming: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/package-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: form.modelId,
          upstreamId: form.upstreamId,
          name: form.name,
          provider: form.provider,
          sort: parseInt(form.sort, 10) || 0,
          supportsStreaming: form.supportsStreaming,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Gagal menyimpan");
      setForm({
        modelId: "",
        upstreamId: "",
        name: "",
        provider: "WeizeRouter",
        sort: "0",
        supportsStreaming: true,
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-medium text-lime-300 transition hover:bg-lime-500/20"
      >
        + Tambah Model Paket
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-lime-500/25 bg-neutral-900 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-neutral-500 block mb-1">
            Model ID publik (tanpa wz/), mis. kimi-k3
          </label>
          <input
            className={inputClass}
            value={form.modelId}
            onChange={(e) => set("modelId", e.target.value)}
            placeholder="kimi-k3"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">
            Upstream ID (sesuai nama model di upstream)
          </label>
          <input
            className={inputClass}
            value={form.upstreamId}
            onChange={(e) => set("upstreamId", e.target.value)}
            placeholder="kimi-k3"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Nama tampilan</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Kimi K3"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Provider</label>
            <input
              className={inputClass}
              value={form.provider}
              onChange={(e) => set("provider", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Sort</label>
            <input
              className={inputClass}
              value={form.sort}
              onChange={(e) => set("sort", e.target.value)}
              type="number"
            />
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-400">
        <input
          type="checkbox"
          checked={form.supportsStreaming}
          onChange={(e) => set("supportsStreaming", e.target.checked)}
          className="accent-lime-400"
        />
        Support streaming
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-lime-500 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-lime-400 disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan Model"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
