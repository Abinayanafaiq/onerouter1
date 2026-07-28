"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PackageData = {
  id: string;
  name: string;
  description: string | null;
  tokenQuota: string;
  price: number;
  durationDays: number;
  sort: number;
  stock: number;
  productType: string;
  isActive: boolean;
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition shrink-0 ${
        checked ? "bg-green-500" : "bg-neutral-700"
      }`}
      aria-label={label}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
          checked ? "translate-x-[18px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-neutral-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm font-mono text-neutral-200";

export function PackageEditor({
  pkg,
  onClose,
}: {
  pkg: PackageData | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isCreate = pkg === null;

  const [form, setForm] = useState({
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    tokenQuota: pkg?.tokenQuota ?? "",
    price: String(pkg?.price ?? 0),
    durationDays: String(pkg?.durationDays ?? 1),
    sort: String(pkg?.sort ?? 0),
    stock: String(pkg?.stock ?? 0),
    productType: pkg?.productType ?? "TOKEN_PACKAGE",
    isActive: pkg?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        tokenQuota: form.tokenQuota,
        price: parseInt(form.price, 10) || 0,
        durationDays: parseInt(form.durationDays, 10) || 1,
        sort: parseInt(form.sort, 10) || 0,
        stock: parseInt(form.stock, 10) || 0,
        productType: form.productType,
        isActive: form.isActive,
      };

      const res = await fetch(
        isCreate ? "/api/admin/packages" : "/api/admin/packages/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isCreate ? payload : { id: pkg?.id, ...payload }),
        },
      );
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg(isCreate ? "Paket dibuat" : "Tersimpan");
        if (isCreate && onClose) {
          onClose();
        }
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
    }, 2500);
  }

  async function handleDelete() {
    if (!pkg) return;
    if (!confirm(`Hapus paket "${pkg.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, { method: "DELETE" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || "Gagal menghapus");
      }
    } catch {
      setError("Koneksi gagal");
    }
    setDeleting(false);
    setTimeout(() => setError(null), 3500);
  }

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-neutral-200">
            {isCreate ? "Paket Baru" : pkg.name}
          </span>
          {!isCreate && (
            <code className="text-xs text-neutral-500 font-mono">{pkg.id}</code>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
            {form.productType}
          </span>
        </div>
        {!isCreate && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-500">Aktif</span>
            <Toggle
              checked={form.isActive}
              onChange={(v) => set("isActive", v)}
              label="Aktif"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Nama Paket">
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
            placeholder="contoh: Paket 100M"
          />
        </Field>
        <Field label="Tipe Produk">
          <select
            value={form.productType}
            onChange={(e) => set("productType", e.target.value)}
            className={inputClass}
          >
            <option value="TOKEN_PACKAGE">TOKEN_PACKAGE</option>
            <option value="LEGACY">LEGACY</option>
          </select>
        </Field>
        <Field label="Token Quota">
          <input
            type="number"
            min="0"
            value={form.tokenQuota}
            onChange={(e) => set("tokenQuota", e.target.value)}
            className={inputClass}
            placeholder="contoh: 20000000"
          />
        </Field>
        <Field label="Sort Order">
          <input
            type="number"
            value={form.sort}
            onChange={(e) => set("sort", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Harga (IDR)">
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-600">Rp</span>
            <input
              type="number"
              step="1000"
              min="0"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className={inputClass}
            />
          </div>
        </Field>
        <Field label="Durasi (hari)">
          <input
            type="number"
            min="1"
            value={form.durationDays}
            onChange={(e) => set("durationDays", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Stok">
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => set("stock", e.target.value)}
            className={inputClass}
          />
        </Field>
        {isCreate && (
          <Field label="Status">
            <div className="flex items-center gap-2 h-[34px]">
              <Toggle
                checked={form.isActive}
                onChange={(v) => set("isActive", v)}
                label="Aktif"
              />
              <span className="text-xs text-neutral-400">
                {form.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </Field>
        )}
      </div>

      <Field label="Deskripsi (opsional)">
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className={inputClass + " resize-none"}
          placeholder="Deskripsi singkat yang ditampilkan di halaman harga"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-neutral-800">
        <button
          onClick={save}
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-1.5 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "Menyimpan..." : isCreate ? "Buat Paket" : "Simpan Perubahan"}
        </button>
        {isCreate && onClose && (
          <button
            onClick={onClose}
            disabled={saving}
            className="border border-neutral-700 text-neutral-300 px-4 py-1.5 rounded-md text-xs hover:bg-neutral-800 disabled:opacity-50 transition"
          >
            Batal
          </button>
        )}
        {!isCreate && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto border border-red-800 text-red-400 px-3 py-1.5 rounded-md text-xs hover:bg-red-950/50 disabled:opacity-50 transition"
          >
            {deleting ? "Menghapus..." : "Hapus Paket"}
          </button>
        )}
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
