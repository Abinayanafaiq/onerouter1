"use client";

import { useState } from "react";
import { PackageEditor, type PackageData } from "./package-editor";

const categories = [
  { key: "general", label: "Semua model", icon: "✦" },
  { key: "glm", label: "GLM", icon: "✳" },
  { key: "kimi", label: "Kimi", icon: "☾" },
  { key: "deepseek", label: "DeepSeek", icon: "≋" },
  { key: "other", label: "Model lainnya", icon: "◇" },
  { key: "legacy", label: "Legacy", icon: "▤" },
] as const;

function categoryOf(pkg: PackageData) {
  if (pkg.productType !== "TOKEN_PACKAGE") return "legacy";
  if (pkg.allowedModels.length === 0) return "general";
  return categories.slice(1, 4).find(({ key }) =>
    pkg.allowedModels.every((model) => model.toLowerCase().includes(key)),
  )?.key ?? "other";
}

export function PackagesManager({
  packages,
  availableModels = [],
}: {
  packages: PackageData[];
  availableModels?: string[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState("general");
  const visibleCategories = categories.filter(({ key }) => packages.some((pkg) => categoryOf(pkg) === key));
  const activeCategory = visibleCategories.some(({ key }) => key === selected)
    ? selected
    : visibleCategories[0]?.key;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">Stok 0 = tidak bisa dibeli</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-neutral-100 text-neutral-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-neutral-300 transition"
        >
          {showAdd ? "Batal" : "+ Tambah Paket"}
        </button>
      </div>

      {showAdd && (
        <PackageEditor pkg={null} onClose={() => setShowAdd(false)} availableModels={availableModels} />
      )}

      {visibleCategories.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Pilih kategori paket">
          {visibleCategories.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={activeCategory === key}
              onClick={() => setSelected(key)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-100 ${
                activeCategory === key
                  ? "border-neutral-400 bg-neutral-100 text-neutral-900"
                  : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-neutral-100"
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">{icon}</span>
              {label}
              <span className={activeCategory === key ? "text-neutral-600" : "text-neutral-500"}>
                {packages.filter((pkg) => categoryOf(pkg) === key).length}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {packages.length === 0 && !showAdd ? (
          <div className="border border-neutral-800 rounded-lg p-6 text-center text-neutral-500 text-sm bg-neutral-900">
            Belum ada paket. Klik &quot;+ Tambah Paket&quot; untuk membuat.
          </div>
        ) : (
          packages.map((p) => (
            <div key={p.id} hidden={categoryOf(p) !== activeCategory}>
              <PackageEditor pkg={p} availableModels={availableModels} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
