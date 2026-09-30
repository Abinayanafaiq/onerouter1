"use client";

import { useState, type ReactNode } from "react";
import { PackageBrandIcon } from "@/app/components/package-brand-icon";

type Group = { key: string; title: string; content: ReactNode };

export default function PackagePicker({ groups }: { groups: Group[] }) {
  const [selected, setSelected] = useState(groups[0]?.key);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2" aria-label="Pilih kategori paket">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            aria-pressed={selected === group.key}
            onClick={() => setSelected(group.key)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              selected === group.key
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-foreground"
            }`}
          >
            <PackageBrandIcon group={group.key} />
            {group.title}
          </button>
        ))}
      </div>
      {groups.find((group) => group.key === selected)?.content}
    </div>
  );
}
