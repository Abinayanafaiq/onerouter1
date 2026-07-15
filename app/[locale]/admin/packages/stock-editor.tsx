"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PackageItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
};

export function PackageStockEditor({ pkg }: { pkg: PackageItem }) {
  const router = useRouter();
  const [stock, setStock] = useState(String(pkg.stock));
  const [isActive, setIsActive] = useState(pkg.isActive);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/packages/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pkg.id,
          stock: parseInt(stock, 10) || 0,
          isActive,
        }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg("✓");
        router.refresh();
      } else {
        setMsg(data.error || "Gagal");
      }
    } catch {
      setMsg("Error");
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 2000);
  }

  return (
    <div className="border border-neutral-800 rounded-lg p-3 bg-neutral-900">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm text-neutral-200">{pkg.name}</span>
          <span className="text-xs text-neutral-500 ml-2">
            Rp{pkg.price.toLocaleString("id-ID")}
          </span>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-3.5 h-3.5 accent-neutral-400"
          />
          Aktif
        </label>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <label className="text-xs text-neutral-500 shrink-0">Stok</label>
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="w-20 px-2 py-1 border border-neutral-700 rounded-md bg-neutral-950 text-sm text-neutral-200"
        />
        {parseInt(stock, 10) === 0 && (
          <span className="text-xs text-red-400">habis</span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="ml-auto bg-neutral-100 text-neutral-900 px-2.5 py-1 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "..." : "Simpan"}
        </button>
        {msg && <span className="text-xs text-neutral-500">{msg}</span>}
      </div>
    </div>
  );
}
