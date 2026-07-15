"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_PROVIDERS } from "@/app/lib/providers";

type ModelData = {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  description: string | null;
  contextWindow: string | null;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  supportsText: boolean;
  supportsImages: boolean;
  supportsStreaming: boolean;
  enabled: boolean;
  maintenanceMode: boolean;
  sort: number;
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-neutral-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-2.5 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm font-mono text-neutral-200";

export function ModelEditor({ model }: { model: ModelData }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: model.name,
    provider: model.provider,
    modelId: model.modelId,
    contextWindow: model.contextWindow ?? "",
    inputPricePerMillion: String(model.inputPricePerMillion),
    outputPricePerMillion: String(model.outputPricePerMillion),
    supportsText: model.supportsText,
    supportsImages: model.supportsImages,
    supportsStreaming: model.supportsStreaming,
    enabled: model.enabled,
    maintenanceMode: model.maintenanceMode,
    sort: String(model.sort),
    description: model.description ?? "",
  });
  const [saving, setSaving] = useState(false);
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
      const res = await fetch("/api/admin/models/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: model.id,
          name: form.name,
          provider: form.provider,
          modelId: form.modelId,
          contextWindow: form.contextWindow || null,
          inputPricePerMillion: parseFloat(form.inputPricePerMillion) || 0,
          outputPricePerMillion: parseFloat(form.outputPricePerMillion) || 0,
          supportsText: form.supportsText,
          supportsImages: form.supportsImages,
          supportsStreaming: form.supportsStreaming,
          enabled: form.enabled,
          maintenanceMode: form.maintenanceMode,
          sort: parseInt(form.sort, 10) || 0,
          description: form.description || null,
        }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setMsg("Tersimpan");
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

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-neutral-200">{model.name}</span>
            <code className="text-xs text-neutral-500 font-mono">{model.modelId}</code>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 capitalize">
              {model.provider}
            </span>
            {model.maintenanceMode && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">
                Maintenance
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-500">Enabled</span>
            <Toggle
              checked={form.enabled}
              onChange={(v) => set("enabled", v)}
              label="Enabled"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-500">Maintenance</span>
            <Toggle
              checked={form.maintenanceMode}
              onChange={(v) => set("maintenanceMode", v)}
              label="Maintenance Mode"
            />
          </div>
        </div>
      </div>

      {/* Grid: identity fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Display Name">
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Provider">
          <select
            value={form.provider}
            onChange={(e) => set("provider", e.target.value)}
            className={inputClass}
          >
            {ALL_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value="prokuy">prokuy</option>
            <option value="9inference">9inference</option>
          </select>
        </Field>
        <Field label="Model ID">
          <input
            type="text"
            value={form.modelId}
            onChange={(e) => set("modelId", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Context Window">
          <input
            type="text"
            value={form.contextWindow}
            onChange={(e) => set("contextWindow", e.target.value)}
            placeholder="e.g. 200K, 1M"
            className={inputClass}
          />
        </Field>
      </div>

      {/* Grid: pricing + sort */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Input Price / 1M token (IDR)">
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-600">Rp</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.inputPricePerMillion}
              onChange={(e) => set("inputPricePerMillion", e.target.value)}
              className={inputClass}
            />
          </div>
        </Field>
        <Field label="Output Price / 1M token (IDR)">
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-600">Rp</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.outputPricePerMillion}
              onChange={(e) => set("outputPricePerMillion", e.target.value)}
              className={inputClass}
            />
          </div>
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

      {/* Description */}
      <Field label="Description (optional)">
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className={inputClass + " resize-none"}
          placeholder="Short description shown on landing page & model selector"
        />
      </Field>

      {/* Capability toggles */}
      <div className="flex flex-wrap items-center gap-5 pt-1">
        <div className="flex items-center gap-2">
          <Toggle
            checked={form.supportsText}
            onChange={(v) => set("supportsText", v)}
            label="Supports Text"
          />
          <span className="text-xs text-neutral-400">Text</span>
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            checked={form.supportsImages}
            onChange={(v) => set("supportsImages", v)}
            label="Supports Images"
          />
          <span className="text-xs text-neutral-400">Images</span>
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            checked={form.supportsStreaming}
            onChange={(v) => set("supportsStreaming", v)}
            label="Supports Streaming"
          />
          <span className="text-xs text-neutral-400">Streaming</span>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1 border-t border-neutral-800">
        <button
          onClick={save}
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-1.5 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
