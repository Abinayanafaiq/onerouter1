"use client";

import { useState } from "react";

type PriorityItem = {
  id: string;
  name: string;
  enabled: boolean;
  modelCount: number;
};

export function UpstreamPriorityForm({ initialItems }: { initialItems: PriorityItem[] }) {
  const [items, setItems] = useState<PriorityItem[]>(initialItems);
  const [saved, setSaved] = useState<string[]>(initialItems.map((i) => i.id));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = items.map((i) => i.id).join("|") !== saved.join("|");

  function flash(text: string, isError = false) {
    if (isError) setError(text);
    else setMsg(text);
    setTimeout(() => {
      setMsg(null);
      setError(null);
    }, 4000);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/backup-priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: items.map((i) => i.id) }),
      });
      const data = (await res.json()) as { success: boolean; items?: PriorityItem[]; error?: string };
      if (data.success && data.items) {
        setItems(data.items);
        setSaved(data.items.map((i) => i.id));
        flash("Urutan prioritas disimpan");
      } else {
        flash(data.error || "Gagal menyimpan", true);
      }
    } catch {
      flash("Koneksi gagal", true);
    }
    setSaving(false);
  }

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-neutral-300">Prioritas Upstream Backup</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Kalau model publik yang sama ada di beberapa upstream, request dikirim ke upstream
          paling atas dulu. Kalau upstream itu error (key/kuota, model tidak ada, server down,
          atau timeout), request otomatis dilempar ke upstream berikutnya sesuai urutan ini.
        </p>
      </div>

      <ol className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex items-center gap-2 border border-neutral-800 rounded-md px-3 py-2 bg-neutral-950/40"
          >
            <span className="w-5 text-xs font-mono text-neutral-500 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-neutral-200 truncate">{item.name}</span>
                {i === 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">Utama</span>
                )}
                {!item.enabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700/40 text-neutral-400">
                    Nonaktif
                  </span>
                )}
              </div>
              <div className="text-[10px] text-neutral-500">{item.modelCount} model</div>
            </div>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={saving || i === 0}
              title="Naikkan prioritas"
              className="w-6 h-6 rounded border border-neutral-700 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 transition text-xs"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={saving || i === items.length - 1}
              title="Turunkan prioritas"
              className="w-6 h-6 rounded border border-neutral-700 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 transition text-xs"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "Menyimpan..." : "Simpan urutan"}
        </button>
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
