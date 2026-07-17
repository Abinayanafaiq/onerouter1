"use client";

import { useState } from "react";

type PackageModelData = {
  id: string;
  modelId: string;
  upstreamId: string;
  name: string;
  provider: string;
  enabled: boolean;
  supportsStreaming: boolean;
};

export function PackageModelEditor({ model }: { model: PackageModelData }) {
  const [enabled, setEnabled] = useState(model.enabled);
  const [streaming, setStreaming] = useState(model.supportsStreaming);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function update(patch: { enabled?: boolean; supportsStreaming?: boolean }) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/package-models/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: model.id, ...patch }),
      });
      const data = await response.json() as { success: boolean; error?: string };
      if (!data.success) throw new Error(data.error || "Gagal menyimpan");
      if (patch.enabled !== undefined) setEnabled(patch.enabled);
      if (patch.supportsStreaming !== undefined) setStreaming(patch.supportsStreaming);
      setMessage("Tersimpan");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 2000);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-neutral-100">{model.name}</h3>
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">{model.provider}</span>
          </div>
          <code className="mt-1.5 block text-xs text-lime-300">{model.modelId}</code>
          <div className="mt-1 text-[10px] text-neutral-600">Upstream: {model.upstreamId}</div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${enabled ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
          {enabled ? "Aktif" : "Nonaktif"}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => update({ enabled: !enabled })}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${enabled ? "border border-red-500/30 text-red-400 hover:bg-red-500/10" : "bg-green-500 text-black hover:bg-green-400"}`}
        >
          {enabled ? "Nonaktifkan" : "Aktifkan"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => update({ supportsStreaming: !streaming })}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
        >
          Streaming: {streaming ? "On" : "Off"}
        </button>
        {message && <span className="ml-auto text-[10px] text-neutral-500">{message}</span>}
      </div>
    </div>
  );
}
