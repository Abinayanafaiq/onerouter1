"use client";

import { useEffect, useState } from "react";

type InitialData = {
  apiKeyMasked: string;
  apiKeySet: boolean;
  ipnSecretSet: boolean;
  sandbox: boolean;
};

export function NowpaymentsForm({ initial }: { initial: InitialData }) {
  const [apiKey, setApiKey] = useState("");
  const [ipnSecret, setIpnSecret] = useState("");
  const [sandbox, setSandbox] = useState(initial.sandbox);
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const body: Record<string, string | boolean> = {};
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (ipnSecret.trim()) body.ipnSecret = ipnSecret.trim();
      if (sandbox !== initial.sandbox) body.sandbox = sandbox;

      if (Object.keys(body).length === 0) {
        setMsg("Tidak ada perubahan");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/settings/nowpayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg("Pengaturan NOWPayments disimpan");
        setApiKey("");
        setIpnSecret("");
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

  async function handleClearIpn() {
    if (!confirm("Hapus IPN Secret? Webhook tidak akan diverifikasi signature-nya.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/nowpayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearIpnSecret: true }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) setMsg("IPN Secret dihapus");
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
        <h2 className="text-sm font-medium text-neutral-300">NOWPayments (Crypto)</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Gateway crypto internasional. Mendukung BTC &amp; USDT multi-chain. Pembayaran diverifikasi otomatis via IPN webhook.
        </p>
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
          Dari dashboard NOWPayments &gt; Account Settings. Disimpan plaintext di DB.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">IPN Secret</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={ipnSecret}
            onChange={(e) => setIpnSecret(e.target.value)}
            placeholder={initial.ipnSecretSet ? "Tersimpan — isi untuk ganti" : "Belum diset"}
            className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
          />
          {initial.ipnSecretSet && (
            <button
              type="button"
              onClick={handleClearIpn}
              disabled={saving}
              className="border border-red-800 text-red-400 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-950/50 disabled:opacity-50 transition"
            >
              Hapus
            </button>
          )}
        </div>
        <p className="text-[10px] text-neutral-600 mt-1">
          Wajib diisi untuk verifikasi signature webhook (HMAC-SHA512).
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sandbox}
          onChange={(e) => setSandbox(e.target.checked)}
          className="w-4 h-4 accent-neutral-100"
        />
        <span className="text-xs text-neutral-400">Sandbox mode (api-sandbox.nowpayments.io)</span>
      </label>

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
          IPN callback URL yang harus diisi di dashboard NOWPayments:
          <code className="block mt-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 font-mono text-neutral-400 break-all">
            {origin}/api/nowpayments/webhook
          </code>
        </p>
      </div>
    </form>
  );
}
