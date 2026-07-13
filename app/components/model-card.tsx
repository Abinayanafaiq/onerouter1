"use client";

import { useState } from "react";
import Link from "next/link";
import type { ModelCardData } from "@/app/lib/model-card-data";

export type { ModelCardData };

const PROVIDER_STYLE: Record<string, { chip: string; dot: string }> = {
  GLM: { chip: "text-emerald-300 border-emerald-500/25 bg-emerald-500/10", dot: "bg-emerald-400" },
  DeepSeek: { chip: "text-violet-300 border-violet-500/25 bg-violet-500/10", dot: "bg-violet-400" },
  Alibaba: { chip: "text-orange-300 border-orange-500/25 bg-orange-500/10", dot: "bg-orange-400" },
  "Moonshot AI": { chip: "text-sky-300 border-sky-500/25 bg-sky-500/10", dot: "bg-sky-400" },
  MiniMax: { chip: "text-pink-300 border-pink-500/25 bg-pink-500/10", dot: "bg-pink-400" },
};

const DEFAULT_STYLE = {
  chip: "text-muted-foreground border-white/10 bg-white/[0.04]",
  dot: "bg-white/40",
};

function capabilities(m: ModelCardData): string[] {
  const tags: string[] = [];
  const hay = (m.name + " " + m.modelId).toLowerCase();
  if (m.supportsText) tags.push("Chat");
  if (/code|coder/.test(hay)) tags.push("Coding");
  if (m.supportsImages) tags.push("Vision");
  if (m.supportsStreaming) tags.push("Streaming");
  if (/pro|reason|o1/.test(hay) && tags.length < 4) tags.push("Reasoning");
  return tags.slice(0, 4);
}

function CopyIdButton({ modelId }: { modelId: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(modelId);
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-medium text-muted-foreground transition hover:text-foreground hover:border-white/20"
      title="Copy model ID"
    >
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
          <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
      <span className="font-mono">{modelId}</span>
    </button>
  );
}

export function ModelCard({ model }: { model: ModelCardData }) {
  const style = PROVIDER_STYLE[model.provider] ?? DEFAULT_STYLE;
  const caps = capabilities(model);
  const inputPrice = model.inputPricePerMillion.toLocaleString("id-ID");
  const outputPrice = model.outputPricePerMillion.toLocaleString("id-ID");

  return (
    <div className="glass card-glow group flex flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
              {model.name}
            </h3>
            {model.maintenanceMode && (
              <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                Maintenance
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            <span className="text-[11px] text-muted-foreground">{model.provider}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.chip}`}>
          {model.provider}
        </span>
      </div>

      {model.description && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {model.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {caps.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-foreground/80"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-accent">
              <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {c}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px]">
        <div>
          <div className="text-muted-foreground">Context</div>
          <div className="mt-0.5 font-semibold text-foreground">{model.contextWindow ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Streaming</div>
          <div className="mt-0.5 font-semibold text-foreground">
            {model.supportsStreaming ? "Supported" : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pricing
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground">Input</div>
            <div className="mt-0.5 text-sm font-semibold text-foreground">
              Rp{inputPrice}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">/1M</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Output</div>
            <div className="mt-0.5 text-sm font-semibold text-foreground">
              Rp{outputPrice}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">/1M</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 pt-1">
        <Link
          href="/dashboard/chat"
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[11px] font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          Try in Playground
        </Link>
        <CopyIdButton modelId={model.modelId} />
      </div>
    </div>
  );
}
