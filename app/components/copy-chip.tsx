"use client";

import { useState } from "react";

/**
 * Compact inline copy button — for short identifiers (model IDs, keys, URLs)
 * where the full CopyableCode block would be too heavy.
 */
export function CopyChip({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Salin ${text}`}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-1 text-[9px] font-medium text-muted-foreground transition hover:border-accent/30 hover:text-accent"
    >
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-accent">
          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
          <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
      {copied ? "Disalin" : "Salin"}
    </button>
  );
}
