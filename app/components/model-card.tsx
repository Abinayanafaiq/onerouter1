"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ModelCardData } from "@/app/lib/model-card-data";

export type { ModelCardData };

const TOKS_TO_RP = 1000;
const TOKS_TO_USD = 0.0553;

function fmtToksUsd(rp: number, locale: string): string {
  const toks = rp / TOKS_TO_RP;
  const toksStr = toks.toLocaleString(locale, { maximumFractionDigits: 1 });
  const usdStr = "US$" + (toks * TOKS_TO_USD).toFixed(2);
  return `${toksStr} TOKS · ${usdStr}`;
}

const PROVIDER_STYLE: Record<string, { avatar: string; dot: string }> = {
  GLM: { avatar: "text-emerald-300 border-emerald-500/25 bg-emerald-500/10", dot: "bg-emerald-400" },
  DeepSeek: { avatar: "text-violet-300 border-violet-500/25 bg-violet-500/10", dot: "bg-violet-400" },
  Alibaba: { avatar: "text-orange-300 border-orange-500/25 bg-orange-500/10", dot: "bg-orange-400" },
  "Moonshot AI": { avatar: "text-sky-300 border-sky-500/25 bg-sky-500/10", dot: "bg-sky-400" },
  MiniMax: { avatar: "text-pink-300 border-pink-500/25 bg-pink-500/10", dot: "bg-pink-400" },
};

const DEFAULT_STYLE = {
  avatar: "text-muted-foreground border-white/10 bg-white/[0.04]",
  dot: "bg-white/40",
};

function capabilityKeys(m: ModelCardData): string[] {
  const tags: string[] = [];
  const hay = (m.name + " " + m.modelId).toLowerCase();
  if (m.supportsText) tags.push("capChat");
  if (/code|coder/.test(hay)) tags.push("capCoding");
  if (m.supportsImages) tags.push("capVision");
  if (m.supportsStreaming) tags.push("capStreaming");
  if (/pro|reason|o1/.test(hay) && tags.length < 4) tags.push("capReasoning");
  return tags.slice(0, 4);
}

function CopyIdButton({ modelId }: { modelId: string }) {
  const t = useTranslations("DashModels");
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
      className="group/copy inline-flex max-w-full items-center gap-1.5 rounded-md text-[11px] text-muted-foreground transition hover:text-foreground"
      title={t("cardCopyId")}
    >
      <span className="truncate font-mono">{modelId}</span>
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0 text-accent">
          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0 opacity-50 transition group-hover/copy:opacity-100">
          <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function PriceCell({ label, rp, locale }: { label: string; rp: number; locale: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
          Rp{rp.toLocaleString(locale)}
        </span>
        <span className="text-[10px] text-muted-foreground">/1M</span>
      </div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground/80 tabular-nums">
        {fmtToksUsd(rp, locale)}
      </div>
    </div>
  );
}

export function ModelCard({ model }: { model: ModelCardData }) {
  const t = useTranslations("DashModels");
  const locale = useLocale();
  const style = PROVIDER_STYLE[model.provider] ?? DEFAULT_STYLE;
  const caps = capabilityKeys(model);

  return (
    <div className="glass card-glow group flex flex-col rounded-2xl p-5">
      {/* Header: avatar + name + provider */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${style.avatar}`}
          aria-hidden
        >
          {model.provider.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground" title={model.name}>
              {model.name}
            </h3>
            {model.maintenanceMode && (
              <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                {t("cardMaintenance")}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
            <span className="shrink-0 text-[11px] text-muted-foreground">{model.provider}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground/40">·</span>
            <CopyIdButton modelId={model.modelId} />
          </div>
        </div>
      </div>

      {model.description && (
        <p className="mt-4 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
          {model.description}
        </p>
      )}

      {/* Capabilities + context */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {model.contextWindow && (
          <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-foreground tabular-nums">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-muted-foreground">
              <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {model.contextWindow} {t("cardContext").toLowerCase()}
          </span>
        )}
        {caps.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-foreground/80"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-accent">
              <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t(c)}
          </span>
        ))}
      </div>

      {/* Pricing */}
      <div className="mt-auto pt-5">
        <div className="grid grid-cols-2 divide-x divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="p-3">
            <PriceCell label={t("cardInput")} rp={model.inputPricePerMillion} locale={locale} />
          </div>
          <div className="p-3">
            <PriceCell label={t("cardOutput")} rp={model.outputPricePerMillion} locale={locale} />
          </div>
        </div>

        <Link
          href="/dashboard/chat"
          className="group/btn mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
        >
          {t("cardTryPlayground")}
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 transition group-hover/btn:translate-x-0.5">
            <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
