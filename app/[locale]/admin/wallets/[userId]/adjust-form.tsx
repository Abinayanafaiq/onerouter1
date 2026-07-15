"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WalletAdjustForm({
  userId,
  currentBalance,
}: {
  userId: string;
  currentBalance: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [action, setAction] = useState<"add" | "deduct">("add");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Amount harus > 0");
      return;
    }
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const signedAmount = action === "add" ? amt : -amt;
      const res = await fetch("/api/admin/wallets/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: signedAmount,
          description: description.trim() || `${action === "add" ? "Admin add" : "Admin deduct"} balance`,
        }),
      });
      const data = (await res.json()) as { success: boolean; error?: string; newBalance?: number };
      if (data.success) {
        setMsg(`Berhasil. Saldo baru: Rp${(data.newBalance ?? 0).toLocaleString("id-ID")}`);
        setAmount("");
        setDescription("");
        router.refresh();
      } else {
        setError(data.error || "Gagal");
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
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-3">
      <h3 className="text-sm font-medium text-neutral-300">Adjust Balance</h3>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAction("add")}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
            action === "add" ? "bg-green-600 text-white" : "border border-neutral-700 text-neutral-400"
          }`}
        >
          + Tambah
        </button>
        <button
          type="button"
          onClick={() => setAction("deduct")}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
            action === "deduct" ? "bg-red-600 text-white" : "border border-neutral-700 text-neutral-400"
          }`}
        >
          − Kurangi
        </button>
      </div>

      <div>
        <label className="text-xs text-neutral-500 block mb-1">Amount (IDR)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10000"
          className="w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm font-mono text-neutral-200"
        />
      </div>

      <div>
        <label className="text-xs text-neutral-500 block mb-1">Catatan (opsional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Compensation for failed request"
          className="w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm text-neutral-200"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-1.5 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "..." : "Eksekusi"}
        </button>
        <span className="text-xs text-neutral-600">Saldo: Rp{currentBalance.toLocaleString("id-ID")}</span>
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
