"use client";

import { useState } from "react";
import { FeatureIso } from "@/app/components/landing/iso-scene";

export type FeatureItem = { title: string; desc: string; icon: React.ReactNode };

/**
 * Daftar keunggulan platform: tab di kiri, panel ilustrasi + kartu detail di kanan.
 */
export function FeatureTabs({ items, label }: { items: FeatureItem[]; label: string }) {
  const [active, setActive] = useState(0);
  const item = items[active];

  return (
    <div className="grid border-y lg:grid-cols-12">
      {/* Daftar tab */}
      <div className="border-b lg:col-span-4 lg:border-b-0 lg:border-r">
        <div className="border-b px-4 py-3">
          <span className="lp-label">{label}</span>
        </div>
        <div role="tablist" aria-orientation="vertical">
          {items.map((f, i) => (
            <button
              key={f.title}
              type="button"
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className="lp-tab text-[14px]"
            >
              <span className="flex items-center gap-3">
                <span className="lp-mono text-[11px] text-muted-foreground">0{i + 1}</span>
                {f.title}
              </span>
              <span
                aria-hidden
                className={`h-2.5 w-2.5 shrink-0 ${active === i ? "bg-[var(--lp-green)]" : "border border-[var(--lp-line)]"}`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div className="relative min-h-[420px] overflow-hidden lg:col-span-8 lg:min-h-[480px]">
        <FeatureIso accent={active} className="absolute inset-0 h-full w-full" />
        <div className="relative m-4 max-w-sm lp-outline bg-white p-5 sm:absolute sm:bottom-6 sm:right-6 sm:m-0 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center bg-[var(--lp-green)] text-black">{item.icon}</span>
            <h3 className="text-[17px] font-medium tracking-tight text-foreground">{item.title}</h3>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">{item.desc}</p>
        </div>
      </div>
    </div>
  );
}
