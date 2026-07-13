"use client";

import { useEffect, useState } from "react";

type InitialData = {
  slug: string;
  apiKeyMasked: string;
  apiKeySet: boolean;
  webhookSecretSet: boolean;
};

export function PakasirForm({ initial }: { initial: InitialData }) {
  const [slug, setSlug] = useState(initial.slug);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const body: Record<string, string | boolean> = {};
      if (slug !== initial.slug) body.slug = slug;
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (webhookSecret.trim()) body.webhookSecret = webhookSecret.trim();

      if (Object.keys(body).length === 0) {
        setMsg("Tidak ada perubahan");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/settings/pakasir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg("Pengaturan Pakasir disimpan");
        setApiKey("");
        setWebhookSecret("");
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

  async function handleClearWebhook() {
    if (!confirm("Hapus Webhook Secret? Webhook tidak akan diverifikasi signature-nya.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/pakasir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearWebhookSecret: true }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) setMsg("Webhook Secret dihapus");
      else setError(data.error || "Gagal menghapus");
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
        <h2 className="text-sm font-medium text-neutral-300">Pakasir Payment Gateway</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Konfigurasi ini menggantikan upload gambar QRIS. Pembayaran diverifikasi otomatis via webhook.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">Project Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="contoh: depodomain"
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
        />
        <p className="text-[10px] text-neutral-600 mt-1">Diambil dari halaman Proyek Pakasir.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={initial.apiKeySet ? `Tersimpan (${initial.apiKeyMasked}) — isi untuk ganti` : "Belum diset"}
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
        />
        <p className="text-[10px] text-neutral-600 mt-1">
          Diperlukan untuk membuat transaksi & verifikasi status. Disimpan plaintext di DB.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">Webhook Secret (optional)</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={initial.webhookSecretSet ? "Tersimpan — isi untuk ganti" : "Belum diset"}
            className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
          />
          {initial.webhookSecretSet && (
            <button
              type="button"
              onClick={handleClearWebhook}
              disabled={saving}
              className="border border-red-800 text-red-400 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-950/50 disabled:opacity-50 transition"
            >
              Hapus
            </button>
          )}
        </div>
        <p className="text-[10px] text-neutral-600 mt-1">
          Jika diset, webhook diverifikasi via HMAC-SHA256. Kosongkan bila Pakasir tidak mengirim signature.
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

      <div className="border-t border-neutral-800 pt-3">
        <p className="text-[10px] text-neutral-600 leading-relaxed">
          Webhook URL yang harus diisi di dashboard Pakasir:
          <code className="block mt-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 font-mono text-neutral-400 break-all">
            {origin}/api/pakasir/webhook
          </code>
        </p>
      </div>
    </form>
  );
}
