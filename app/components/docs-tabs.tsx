"use client";

import { useState, type ReactNode } from "react";

export type DocsTab = {
  id: string;
  label: string;
  logo?: string;
  hint?: string;
  content: ReactNode;
};

/**
 * Tab switcher for the docs page. Panels are rendered on the server and
 * passed in as `content`, so only the active one is mounted.
 * - "cards": large picker with logo (one per IDE).
 * - "pills": compact segmented control (e.g. PAYG vs paket).
 */
export function DocsTabs({
  tabs,
  variant = "cards",
  ariaLabel,
}: {
  tabs: DocsTab[];
  variant?: "cards" | "pills";
  ariaLabel?: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!current) return null;

  if (variant === "pills") {
    return (
      <div>
        <div
          role="tablist"
          aria-label={ariaLabel}
          className="inline-flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === current.id}
              onClick={() => setActive(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                tab.id === current.id
                  ? "bg-foreground text-background shadow"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="mt-3">
          {current.content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={`grid gap-3 sm:grid-cols-2 ${tabs.length >= 3 ? "lg:grid-cols-3" : ""}`}
      >
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(tab.id)}
              className={`group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-accent/40 bg-accent/[0.07] shadow-[0_0_0_1px_rgba(184,255,69,0.08)]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]"
              }`}
            >
              {tab.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tab.logo}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-xl border border-white/[0.08] bg-black/60 object-contain p-1.5"
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold tracking-tight">{tab.label}</span>
                {tab.hint && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{tab.hint}</span>
                )}
              </span>
              <span
                className={`h-2 w-2 shrink-0 rounded-full transition ${
                  selected ? "bg-accent" : "bg-white/[0.12] group-hover:bg-white/[0.25]"
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <div role="tabpanel" key={current.id} className="animate-fade-up">
        {current.content}
      </div>
    </div>
  );
}
