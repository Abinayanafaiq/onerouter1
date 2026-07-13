"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WhatsAppForm({
  userId,
  currentWhatsApp,
}: {
  userId: string;
  currentWhatsApp: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentWhatsApp ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/whatsapp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: value.trim() === "" ? "" : value.trim() }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg("WhatsApp disimpan");
        router.refresh();
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

  async function clearNumber() {
    if (!confirm("Hapus nomor WhatsApp user ini?")) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/whatsapp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: "" }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setValue("");
        setMsg("WhatsApp dihapus");
        router.refresh();
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
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-neutral-300">WhatsApp</h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Nomor WhatsApp user. Hanya visible admin. Format: digit 8-15, "+" opsional.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="+6281234567890"
          className="flex-1 px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm font-mono text-neutral-200"
        />
        {currentWhatsApp && (
          <button
            type="button"
            onClick={clearNumber}
            disabled={saving}
            className="border border-red-800 text-red-400 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-950/50 disabled:opacity-50 transition"
          >
            Hapus
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-1.5 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "..." : "Simpan"}
        </button>
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
