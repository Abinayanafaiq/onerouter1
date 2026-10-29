"use client";

import { useState } from "react";
import { PackageEditor, type PackageData } from "./package-editor";
import { PackageBrandIcon } from "@/app/components/package-brand-icon";

const categories = [
  { key: "general", label: "Semua model" },
  { key: "glm", label: "GLM" },
  { key: "kimi", label: "Kimi" },
  { key: "deepseek", label: "DeepSeek" },
  { key: "claude", label: "Claude" },
  { key: "qwen", label: "Qwen" },
  { key: "gemini", label: "Gemini" },
  { key: "minimax", label: "MiniMax" },
  { key: "mixed", label: "Multi-model" },
  { key: "other", label: "Model lainnya" },
  { key: "legacy", label: "Legacy" },
] as const;

const brandKeys = ["glm", "kimi", "deepseek", "claude", "qwen", "gemini", "minimax"];

function categoryOf(pkg: PackageData) {
  if (pkg.productType !== "TOKEN_PACKAGE") return "legacy";
  if (pkg.allowedModels.length === 0) return "general";
  const models = pkg.allowedModels.map((model) => model.toLowerCase());
  const brand = brandKeys.find((key) => models.every((model) => model.includes(key)));
  if (brand) return brand;
  return new Set(models).size > 1 ? "mixed" : "other";
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
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const matchesSearch = (pkg: PackageData) =>
    [pkg.name, ...pkg.allowedModels].some((text) => text.toLowerCase().includes(search));
  const isVisible = (pkg: PackageData) =>
    search ? matchesSearch(pkg) : categoryOf(pkg) === activeCategory;
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

      {packages.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama paket atau model…"
          aria-label="Cari paket"
          className="w-full sm:max-w-xs px-3 py-1.5 border border-neutral-700 rounded-md bg-neutral-950 text-sm text-neutral-200 placeholder:text-neutral-600"
        />
      )}

      {visibleCategories.length > 0 && !search && (
        <div className="flex flex-wrap gap-2" aria-label="Pilih kategori paket">
          {visibleCategories.map(({ key, label }) => (
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
              <PackageBrandIcon group={key} className="h-5 w-5" />
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
            <div key={p.id} hidden={!isVisible(p)}>
              <PackageEditor pkg={p} availableModels={availableModels} />
            </div>
          ))
        )}
        {search && !packages.some(matchesSearch) && (
          <p className="text-sm text-neutral-500 text-center py-6">Tidak ada paket yang cocok dengan &quot;{query.trim()}&quot;.</p>
        )}
      </div>
    </div>
  );
}
