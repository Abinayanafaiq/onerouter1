"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TOKS_LABEL, idrToToks } from "@/app/lib/constants";
import { triggerWalletRefresh } from "@/app/components/credit-badge";

// Show a low-balance warning when the wallet drops below this (IDR).
const LOW_BALANCE_THRESHOLD = 2000;

type ModelInfo = {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
};

type BillingInfo = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  remainingBalance: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  model?: string;
  billing?: BillingInfo;
};

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <path
          d="M12 3v3m0 12v3M3 12h3m12 0h3M6.3 6.3l2.1 2.1m7.2 7.2 2.1 2.1m0-11.4-2.1 2.1m-7.2 7.2-2.1 2.1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function ChatPlayground({
  models,
  initialBalance,
}: {
  models: ModelInfo[];
  initialBalance: number;
}) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(models[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [lastBilling, setLastBilling] = useState<BillingInfo | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-grow the composer up to a max height.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [input]);

  const isExhausted = balance <= 0;
  const isLow = !isExhausted && balance < LOW_BALANCE_THRESHOLD;
  const estRemaining = lastBilling && lastBilling.totalCost > 0
    ? Math.floor(balance / lastBilling.totalCost)
    : null;
  const currentModel = models.find((m) => m.id === model);

  const fmtToks = (idr: number, digits: number) =>
    idrToToks(idr).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: digits });

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading || isExhausted) return;
    setError(null);
    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/dashboard/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          stream: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error?.message || `HTTP ${res.status}`;
        setError(errMsg);
        setMessages((prev) => prev.slice(0, -1));
        setInput(content);
        // 402 = insufficient balance: lock the UI and sync balance.
        if (res.status === 402) {
          setBalance(0);
          triggerWalletRefresh();
        }
        return;
      }

      const assistantContent =
        data?.choices?.[0]?.message?.content || t("emptyResponse");
      const billing = data.x_billing as BillingInfo | undefined;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantContent, model: currentModel?.name ?? model, billing },
      ]);

      if (billing) {
        setLastBilling(billing);
        setBalance(billing.remainingBalance);
      }
      // Sync navbar badge + analytics after every request.
      triggerWalletRefresh();
    } catch {
      setError(t("connectionFailed"));
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function newChat() {
    setMessages([]);
    setError(null);
    setInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const suggestions = [t("suggestion1"), t("suggestion2"), t("suggestion3")];

  return (
    <div className="space-y-3">
      {/* Exhausted lock */}
      {isExhausted && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-400">{t("insufficientCredits")}</p>
          <Link
            href="/dashboard/wallet"
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black transition hover:opacity-90"
          >
            {t("topUpCredits")}
          </Link>
        </div>
      )}

      {/* Low-balance warning */}
      {isLow && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-400">
            {t("lowBalanceWarning", {
              estimate:
                estRemaining !== null
                  ? t("lowBalanceEstimate", { count: estRemaining.toLocaleString(locale) })
                  : "",
            })}
          </p>
          <Link
            href="/dashboard/wallet"
            className="shrink-0 rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/10"
          >
            {t("topUp")}
          </Link>
        </div>
      )}

      <div className="glass flex h-[calc(100vh-14rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isExhausted || loading}
              aria-label={t("modelLabel")}
              className="w-full appearance-none truncate rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-3 pr-8 text-xs font-medium text-foreground transition hover:border-white/20 focus:border-accent/50 focus:outline-none disabled:opacity-50 sm:w-64"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-neutral-900">
                  {m.name}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {currentModel && (
            <span className="hidden text-[11px] text-muted-foreground tabular-nums md:inline">
              Rp{currentModel.inputPrice.toLocaleString(locale)} / Rp{currentModel.outputPrice.toLocaleString(locale)}
              <span className="text-muted-foreground/60"> per 1M</span>
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                isExhausted
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
              title={estRemaining !== null ? t("requestsRemaining", { count: estRemaining.toLocaleString(locale) }) : undefined}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isExhausted ? "bg-red-400" : isLow ? "bg-amber-400" : "bg-accent"}`} />
              <span className="text-muted-foreground">{t("balanceLabel")}</span>
              <span className={`font-semibold tabular-nums ${isExhausted ? "text-red-400" : "text-foreground"}`}>
                {fmtToks(balance, 4)} {TOKS_LABEL}
              </span>
            </div>
            <button
              type="button"
              onClick={newChat}
              disabled={loading || messages.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-white/20 hover:text-foreground disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-muted-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">{t("newChat")}</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 && !loading ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path
                    d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">{t("emptyTitle")}</h2>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {t("emptyStateLine1")} {t("emptyStateLine2")}
              </p>
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={isExhausted}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-left text-xs leading-relaxed text-muted-foreground transition hover:border-accent/30 hover:bg-accent/5 hover:text-foreground disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((msg, i) =>
                msg.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-black">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <AssistantAvatar />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{msg.model}</div>
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                        {msg.content}
                      </div>
                      {msg.billing && (
                        <div
                          className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[10px] text-muted-foreground tabular-nums"
                          title={t("costBreakdown", {
                            input: `${idrToToks(msg.billing.inputCost).toFixed(6)} ${TOKS_LABEL}`,
                            output: `${idrToToks(msg.billing.outputCost).toFixed(6)} ${TOKS_LABEL}`,
                          })}
                        >
                          <span>
                            {msg.billing.inputTokens.toLocaleString(locale)} → {msg.billing.outputTokens.toLocaleString(locale)} {t("tokensShort")}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-accent-2">−{fmtToks(msg.billing.totalCost, 6)} {TOKS_LABEL}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span>
                            {t("remainingBalance")}: {fmtToks(msg.billing.remainingBalance, 4)} {TOKS_LABEL}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
              {loading && (
                <div className="flex gap-3">
                  <AssistantAvatar />
                  <div className="flex items-center gap-1 pt-2" aria-label={t("typing")}>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
            {error.includes("balance") && (
              <> · <Link href="/dashboard/wallet" className="font-medium underline">{t("topUpLink")}</Link></>
            )}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-white/[0.06] p-3 sm:p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2 transition focus-within:border-accent/40">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isExhausted ? t("placeholderExhausted") : t("placeholderDefault")}
              rows={1}
              className="max-h-[180px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
              disabled={loading || isExhausted}
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={loading || !input.trim() || isExhausted}
              aria-label={t("send")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-black transition hover:opacity-90 disabled:bg-white/10 disabled:text-muted-foreground"
            >
              {loading ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
          <p className="mx-auto mt-1.5 max-w-3xl px-1 text-[10px] text-muted-foreground/60">{t("enterHint")}</p>
        </div>
      </div>
    </div>
  );
}
