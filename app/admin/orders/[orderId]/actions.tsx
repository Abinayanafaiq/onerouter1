"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderActions({
  orderId,
  packageId,
  userId,
}: {
  orderId: string;
  packageId: string;
  userId: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [masterApiKey, setMasterApiKey] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);

  async function handle(action: "approve" | "reject") {
    if (action === "approve" && !masterApiKey.trim()) {
      alert("Master API key wajib diisi saat approve");
      return;
    }
    setSubmitting(action);
    try {
      const res = await fetch("/api/admin/orders/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, packageId, userId, action, note, masterApiKey }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || "Gagal");
        setSubmitting(null);
      }
    } catch {
      alert("Koneksi gagal");
      setSubmitting(null);
    }
  }

  return (
    <div className="border border-neutral-800 rounded-lg p-3 bg-neutral-900 space-y-3">
      <h3 className="text-sm font-medium text-neutral-300">Tindakan Admin</h3>
      <div>
        <label className="text-xs text-neutral-500 block mb-1">
          Master API Key (wajib saat approve)
        </label>
        <input
          type="text"
          value={masterApiKey}
          onChange={(e) => setMasterApiKey(e.target.value)}
          placeholder="pk_live_xxx atau sk-xxx"
          className="w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm font-mono text-neutral-200 placeholder:text-neutral-600"
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Catatan (opsional)"
        rows={2}
        className="w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm text-neutral-200 placeholder:text-neutral-600"
      />
      <div className="flex gap-2">
        <button
          onClick={() => handle("approve")}
          disabled={submitting !== null}
          className="flex-1 bg-green-600 text-white py-1.5 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
        >
          {submitting === "approve" ? "..." : "✓ Approve"}
        </button>
        <button
          onClick={() => handle("reject")}
          disabled={submitting !== null}
          className="flex-1 bg-red-600 text-white py-1.5 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
        >
          {submitting === "reject" ? "..." : "✗ Reject"}
        </button>
      </div>
    </div>
  );
}
