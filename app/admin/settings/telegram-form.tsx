"use client";

import { useState } from "react";

export function TelegramForm({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg("URL Telegram disimpan");
      } else {
        setError(data.error || "Gagal menyimpan");
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

  async function handleClear() {
    if (!confirm("Hapus URL Telegram? Tombol join akan hilang dari dashboard user.")) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setUrl("");
        setMsg("URL Telegram dihapus");
      } else {
        setError(data.error || "Gagal menghapus");
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

  return (
    <form onSubmit={handleSave} className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-neutral-300">Telegram Group Link</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Tautan grup Telegram yang ditampilkan di dashboard user. Harus diawali https://t.me/ atau https://telegram.me/.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">Group Invite URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://t.me/+AbCdEfGhIjKl"
            className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
          />
          {initialUrl && (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="border border-red-800 text-red-400 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-950/50 disabled:opacity-50 transition"
            >
              Hapus
            </button>
          )}
        </div>
        <p className="text-[10px] text-neutral-600 mt-1">
          Mendukung private invite (https://t.me/+...). Jangan masukkan secret di URL — ini public-facing.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      {url && (
        <div className="border-t border-neutral-800 pt-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-accent hover:underline"
          >
            Buka link untuk verifikasi →
          </a>
        </div>
      )}
    </form>
  );
}
