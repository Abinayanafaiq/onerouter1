"use client";

import { useState, useEffect, useRef } from "react";
import { maskKey } from "@/app/lib/apikey";

export function RevealKey({ rawKey, isExpired }: { rawKey: string; isExpired: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function toggleReveal() {
    setRevealed((prev) => {
      const next = !prev;
      if (next) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setRevealed(false), 30_000);
      }
      return next;
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  if (isExpired) {
    return <code className="text-xs font-mono break-all flex-1">{maskKey(rawKey)}</code>;
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <code className="text-xs font-mono break-all">
        {revealed ? rawKey : maskKey(rawKey)}
      </code>
      <button
        onClick={toggleReveal}
        type="button"
        className="text-[10px] text-muted-foreground hover:text-foreground transition shrink-0 border px-1.5 py-0.5 rounded"
      >
        {revealed ? "Hide" : "Show"}
      </button>
      <button
        onClick={copy}
        type="button"
        className="text-[10px] text-muted-foreground hover:text-foreground transition shrink-0 border px-1.5 py-0.5 rounded"
      >
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}
