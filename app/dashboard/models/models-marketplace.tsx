"use client";

import { useMemo, useState } from "react";
import { ModelCard } from "@/app/components/model-card";
import type { ModelCardData } from "@/app/lib/model-card-data";

type SortKey = "featured" | "price-asc" | "price-desc" | "name";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A → Z" },
];

export function ModelsMarketplace({
  models,
  providers,
}: {
  models: ModelCardData[];
  providers: string[];
}) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("featured");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = models.filter((m) => {
      if (provider !== "all" && m.provider !== provider) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
      );
    });

    list = [...list];
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.inputPricePerMillion - b.inputPricePerMillion);
        break;
      case "price-desc":
        list.sort((a, b) => b.inputPricePerMillion - a.inputPricePerMillion);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return list;
  }, [models, query, provider, sort]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass sticky top-[4.5rem] z-20 rounded-2xl p-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models, providers, IDs…"
              className="w-full rounded-lg border border-white/[0.08] bg-black/30 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Provider filter */}
          <div className="flex items-center gap-2">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-foreground transition focus:border-accent/40 focus:outline-none"
            >
              <option value="all">All providers</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-foreground transition focus:border-accent/40 focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active chips */}
        <div className="mt-2.5 flex items-center gap-2 px-0.5">
          <span className="text-[11px] text-muted-foreground">
            {filtered.length} model{filtered.length === 1 ? "" : "s"}
          </span>
          {(provider !== "all" || query) && (
            <button
              type="button"
              onClick={() => {
                setProvider("all");
                setQuery("");
              }}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground transition hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.02] text-muted-foreground">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">No models found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search term or provider.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      )}
    </div>
  );
}
