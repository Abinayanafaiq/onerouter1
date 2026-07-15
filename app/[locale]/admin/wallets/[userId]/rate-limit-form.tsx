"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RateLimitForm({
  userId,
  currentLimit,
}: {
  userId: string;
  currentLimit: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentLimit?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/rate-limit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateLimit: value.trim() === "" ? 0 : value.trim() }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg("Rate limit disimpan");
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

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-neutral-300">Rate Limit (per user)</h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Batas request per menit untuk user ini. 0 / kosong = unlimited.
          Batas ini berlaku selain batas per API key; yang lebih ketat menang.
        </p>
      </div>

      <div>
        <label className="text-xs text-neutral-500 block mb-1">Rate limit (req/min)</label>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0 = unlimited"
          className="w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm font-mono text-neutral-200"
        />
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
