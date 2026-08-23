"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GrantablePackage = {
  id: string;
  name: string;
  productType: string;
  tokenQuota: string;
  durationDays: number;
};

type GrantResponse = {
  success: boolean;
  error?: string;
  order?: { id: string; status: string; expiresAt: string | null };
  apiKey?: {
    id: string;
    key: string | null;
    tokenQuota: string;
    expiresAt: string | null;
  } | null;
};

export function GrantPackageForm({
  userId,
  packages,
}: {
  userId: string;
  packages: GrantablePackage[];
}) {
  const router = useRouter();
  const [packageId, setPackageId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState<{ key: string | null; orderId: string } | null>(null);

  async function submit() {
    if (!packageId) {
      setError("Pilih paket dulu");
      return;
    }
    const pkg = packages.find((p) => p.id === packageId);
    if (!confirm(`Aktifkan paket "${pkg?.name ?? packageId}" ke user ini tanpa pembayaran?`)) {
      return;
    }
    setSaving(true);
    setMsg(null);
    setError(null);
    setGranted(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/grant-package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, note: note.trim() || undefined }),
      });
      const data = (await res.json()) as GrantResponse;
      if (data.success) {
        setMsg("Paket berhasil diaktifkan");
        if (data.order) {
          setGranted({ key: data.apiKey?.key ?? null, orderId: data.order.id });
        }
        setPackageId("");
        setNote("");
        router.refresh();
      } else {
        setError(data.error || "Gagal");
      }
    } catch {
      setError("Koneksi gagal");
    }
    setSaving(false);
  }

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-neutral-300">Berikan Paket Manual</h3>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          Aktifkan paket ke user tanpa pembayaran. Tidak mengurangi stok paket.
        </p>
      </div>

      <div>
        <label className="text-xs text-neutral-500 block mb-1">Paket</label>
        <select
          value={packageId}
          onChange={(e) => setPackageId(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm text-neutral-200"
        >
          <option value="">— Pilih paket —</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {Number(p.tokenQuota).toLocaleString("id-ID")} token · {p.durationDays} hari
              {p.productType === "LEGACY" ? " · LEGACY" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-neutral-500 block mb-1">Catatan (opsional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Hadiah promo / kompensasi / dll"
          className="w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm text-neutral-200"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-1.5 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "..." : "Aktifkan Paket"}
        </button>
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      {granted && (
        <div className="border border-green-900/60 bg-green-950/30 rounded-md p-2.5 space-y-1">
          <div className="text-[11px] text-neutral-400">
            Order: <span className="font-mono">{granted.orderId}</span>
          </div>
          {granted.key && (
            <>
              <div className="text-[11px] text-neutral-400">
                API Key baru (juga tersimpan di detail order):
              </div>
              <code className="block text-xs font-mono text-green-300 break-all select-all">
                {granted.key}
              </code>
            </>
          )}
        </div>
      )}
    </div>
  );
}
