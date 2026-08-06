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
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-medium text-muted-foreground transition hover:text-foreground hover:border-white/20"
      title={t("cardCopyId")}
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
  const t = useTranslations("DashModels");
  const locale = useLocale();
  const style = PROVIDER_STYLE[model.provider] ?? DEFAULT_STYLE;
  const caps = capabilityKeys(model);
  const inputPrice = model.inputPricePerMillion.toLocaleString(locale);
  const outputPrice = model.outputPricePerMillion.toLocaleString(locale);

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
                {t("cardMaintenance")}
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
            {t(c)}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px]">
        <div>
          <div className="text-muted-foreground">{t("cardContext")}</div>
          <div className="mt-0.5 font-semibold text-foreground tabular-nums">{model.contextWindow ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{t("cardStreaming")}</div>
          <div className="mt-0.5 font-semibold text-foreground">
            {model.supportsStreaming ? t("cardSupported") : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("cardPricing")}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground">{t("cardInput")}</div>
            <div className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">
              Rp{inputPrice}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">/1M</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
              {fmtToksUsd(model.inputPricePerMillion, locale)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">{t("cardOutput")}</div>
            <div className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">
              Rp{outputPrice}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">/1M</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
              {fmtToksUsd(model.outputPricePerMillion, locale)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 pt-1">
        <Link
          href="/dashboard/chat"
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[11px] font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          {t("cardTryPlayground")}
        </Link>
        <CopyIdButton modelId={model.modelId} />
      </div>
    </div>
  );
}
