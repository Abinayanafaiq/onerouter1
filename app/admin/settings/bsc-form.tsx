"use client";

import { useEffect, useState } from "react";

type InitialData = {
  walletAddress: string;
  rpcUrl: string;
  confirmations: number;
  isConfigured: boolean;
};

export function BscForm({ initial }: { initial: InitialData }) {
  const [walletAddress, setWalletAddress] = useState(initial.walletAddress);
  const [rpcUrl, setRpcUrl] = useState(initial.rpcUrl);
  const [confirmations, setConfirmations] = useState(String(initial.confirmations));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWalletAddress(initial.walletAddress);
    setRpcUrl(initial.rpcUrl);
    setConfirmations(String(initial.confirmations));
  }, [initial]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const body: Record<string, string | number> = {};
      if (walletAddress !== initial.walletAddress) body.walletAddress = walletAddress;
      if (rpcUrl !== initial.rpcUrl) body.rpcUrl = rpcUrl;
      if (parseInt(confirmations, 10) !== initial.confirmations) body.confirmations = parseInt(confirmations, 10);

      if (Object.keys(body).length === 0) {
        setMsg("Tidak ada perubahan");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/settings/bsc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg("Pengaturan USDT BEP20 disimpan");
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

  return (
    <form onSubmit={handleSave} className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-neutral-300">USDT BEP20 (Direct On-Chain)</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Terima USDT di BSC langsung ke wallet Anda. Monitoring otomatis via BSC RPC. No gateway, no minimum, no API fee.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">Wallet Address (USDT BEP20)</label>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
        />
        <p className="text-[10px] text-neutral-600 mt-1">
          Address publik untuk menerima USDT BEP20. User akan transfer ke address ini.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">BSC RPC URL</label>
        <input
          type="text"
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
          placeholder="https://bsc-dataseed.binance.org"
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
        />
        <p className="text-[10px] text-neutral-600 mt-1">
          Public BSC RPC untuk monitoring blockchain. Default: bsc-dataseed.binance.org
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">Konfirmasi Block</label>
        <input
          type="number"
          value={confirmations}
          onChange={(e) => setConfirmations(e.target.value)}
          min={1}
          max={100}
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
        />
        <p className="text-[10px] text-neutral-600 mt-1">
          Jumlah block konfirmasi sebelum order di-approve. Default: 12 (~36 detik).
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

      <div className="border-t border-neutral-800 pt-3 space-y-1">
        <p className="text-[10px] text-neutral-600 leading-relaxed">
          <span className="text-neutral-400">Cara kerja:</span>
        </p>
        <ol className="text-[10px] text-neutral-600 leading-relaxed list-decimal list-inside space-y-0.5">
          <li>User buat order, sistem generate amount unik (mis. 1.234567 USDT)</li>
          <li>User transfer USDT BEP20 ke wallet address Anda dengan amount persis</li>
          <li>Backend polling BSC via RPC, cari Transfer event dengan amount matching</li>
          <li>Setelah N konfirmasi block, order auto-approve & TOKS masuk</li>
        </ol>
      </div>
    </form>
  );
}
