"use client";

import { useState, useRef, useEffect } from "react";
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

type Message = {
  role: "user" | "assistant";
  content: string;
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

export function ChatPlayground({
  models,
  initialBalance,
}: {
  models: ModelInfo[];
  initialBalance: number;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(models[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const isExhausted = balance <= 0;
  const isLow = !isExhausted && balance < LOW_BALANCE_THRESHOLD;
  const estRemaining = billing && billing.totalCost > 0
    ? Math.floor(balance / billing.totalCost)
    : null;

  async function send() {
    if (!input.trim() || loading || isExhausted) return;
    setError(null);
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setBilling(null);

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
        // 402 = insufficient balance: lock the UI and sync balance.
        if (res.status === 402) {
          setBalance(0);
          triggerWalletRefresh();
        }
        return;
      }

      const assistantContent =
        data?.choices?.[0]?.message?.content || "(empty response)";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);

      if (data.x_billing) {
        setBilling(data.x_billing as BillingInfo);
        setBalance(data.x_billing.remainingBalance as number);
      }
      // Sync navbar badge + analytics after every request.
      triggerWalletRefresh();
    } catch {
      setError("Koneksi gagal");
      setMessages((prev) => prev.slice(0, -1));
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="space-y-3">
      {/* Balance + Model selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`border rounded-md px-3 py-1.5 text-xs ${isExhausted ? "border-red-500/40 bg-red-500/10" : ""}`}>
          <span className="text-muted-foreground">Saldo: </span>
          <span className={`font-bold ${isExhausted ? "text-red-500" : "text-green-600"}`}>
            {idrToToks(balance).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })} {TOKS_LABEL}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Model:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isExhausted}
            className="border rounded-md px-2 py-1.5 text-xs bg-background disabled:opacity-50"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id})
              </option>
            ))}
          </select>
        </div>
        {estRemaining !== null && !isExhausted && (
          <span className="text-[11px] text-muted-foreground">
            ~{estRemaining.toLocaleString("id-ID")} request tersisa
          </span>
        )}
      </div>

      {/* Exhausted lock */}
      {isExhausted && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-red-500 font-medium">
            Insufficient credits. Please top up your wallet balance to continue using AI services.
          </p>
          <Link
            href="/dashboard/wallet"
            className="shrink-0 bg-foreground text-background px-4 py-2 rounded-md text-xs font-medium hover:opacity-90"
          >
            Top Up Credits
          </Link>
        </div>
      )}

      {/* Low-balance warning */}
      {isLow && (
        <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-yellow-600">
            Saldo kredit menipis
            {estRemaining !== null ? ` (~${estRemaining.toLocaleString("id-ID")} request lagi)` : ""}. Segera top up agar tidak terputus.
          </p>
          <Link
            href="/dashboard/wallet"
            className="shrink-0 border border-yellow-500/40 text-yellow-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-yellow-500/10"
          >
            Top Up
          </Link>
        </div>
      )}

      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="border rounded-lg h-[400px] overflow-y-auto p-4 space-y-3 bg-muted/20"
      >
        {messages.length === 0 && !loading && (
          <div className="text-center text-sm text-muted-foreground py-12">
            Mulai chat dengan mengetik pesan di bawah.
            <br />
            Billing akan tampil setelah setiap respons AI.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-background border"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-background border rounded-lg px-3 py-2 text-sm text-muted-foreground">
              <span className="animate-pulse">Mengetik...</span>
            </div>
          </div>
        )}
      </div>

      {/* Billing info after response */}
      {billing && (
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Billing Response
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Input Tokens</div>
              <div className="font-bold">{billing.inputTokens.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Output Tokens</div>
              <div className="font-bold">{billing.outputTokens.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Tokens</div>
              <div className="font-bold">{billing.totalTokens.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Cost</div>
              <div className="font-bold text-red-600">
                {idrToToks(billing.totalCost).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 6 })} {TOKS_LABEL}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Remaining Balance</div>
              <div className="font-bold text-green-600">
                {idrToToks(billing.remainingBalance).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })} {TOKS_LABEL}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            Input: {idrToToks(billing.inputCost).toFixed(6)} {TOKS_LABEL} · Output: {idrToToks(billing.outputCost).toFixed(6)} {TOKS_LABEL}
          </div>
        </div>
      )}

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-sm text-red-600">
          {error}
          {error.includes("balance") && (
            <> · <Link href="/dashboard/wallet" className="underline font-medium">Top up</Link></>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isExhausted ? "Kredit habis — top up untuk melanjutkan" : "Ketik pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"}
          rows={2}
          className="flex-1 px-3 py-2 border rounded-md bg-background text-sm resize-none disabled:opacity-50"
          disabled={loading || isExhausted}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim() || isExhausted}
          className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 self-end"
        >
          {loading ? "..." : "Kirim"}
        </button>
      </div>
    </div>
  );
}
