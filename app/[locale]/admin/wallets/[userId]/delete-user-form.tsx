"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteUserForm({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = confirmText.trim().toLowerCase() === email.trim().toLowerCase() && !busy;

  async function submit() {
    if (!canSubmit) return;
    if (!window.confirm(`Yakin hapus user "${email}"? Semua wallet, API key, order, dan riwayat transaksi user ini akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setDone(true);
        setTimeout(() => router.push("/admin/wallets"), 1200);
        setTimeout(() => router.refresh(), 1500);
      } else {
        setError(data.error || "Gagal menghapus user");
      }
    } catch {
      setError("Koneksi gagal");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="border border-green-800 rounded-lg p-4 bg-green-950/40">
        <p className="text-sm text-green-400">User berhasil dihapus. Mengalihkan ke daftar wallet…</p>
      </div>
    );
  }

  return (
    <div className="border border-red-900/60 rounded-lg p-4 bg-red-950/20 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-red-400">Danger Zone · Hapus User</h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Hapus user beserta wallet, API key, order, dan riwayat transaksinya secara permanen.
          Ketik email user untuk konfirmasi.
        </p>
      </div>

      <div>
        <label className="text-xs text-neutral-500 block mb-1">
          Ketik email untuk konfirmasi: <span className="font-mono text-neutral-300">{email}</span>
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={email}
          autoComplete="off"
          className="w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm font-mono text-neutral-200"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="bg-red-600 text-white px-4 py-1.5 rounded-md text-xs font-medium hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {busy ? "Menghapus…" : "Hapus Permanen"}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
