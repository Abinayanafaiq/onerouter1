"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TOKS_LABEL } from "@/app/lib/constants";

/** Fire this on the window to make every CreditBadge refetch immediately. */
export const WALLET_REFRESH_EVENT = "wallet:refresh";

export function triggerWalletRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WALLET_REFRESH_EVENT));
  }
}

type Summary = {
  balanceToks: number;
  balance: number;
  estimatedRemainingRequests: number | null;
};

export function CreditBadge({ initialToks }: { initialToks: number }) {
  const [toks, setToks] = useState(initialToks);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/summary", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; summary?: Summary };
        if (data.success && data.summary) {
          setToks(data.summary.balanceToks);
        }
      }
    } catch {
      // ignore transient errors
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Don't refetch immediately on mount — the server already passed in
    // initialToks via the layout. Wait a short beat so we don't pile onto the
    // same connection pool window as the layout/page render.
    const mountTimer = setTimeout(refresh, 1500);
    const onEvent = () => refresh();
    window.addEventListener(WALLET_REFRESH_EVENT, onEvent);
    window.addEventListener("focus", onEvent);
    const interval = setInterval(refresh, 30000);
    return () => {
      clearTimeout(mountTimer);
      window.removeEventListener(WALLET_REFRESH_EVENT, onEvent);
      window.removeEventListener("focus", onEvent);
      clearInterval(interval);
    };
  }, [refresh]);

  const isEmpty = toks <= 0;

  return (
    <Link
      href="/dashboard/wallet"
      className={`flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-medium transition ${
        isEmpty
          ? "border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500/20"
          : "border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500/20"
      }`}
      title="Saldo kredit — klik untuk top up"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isEmpty ? "bg-red-500" : "bg-green-500"
        } ${loading ? "animate-pulse" : ""}`}
      />
      <span className="font-mono">
        {toks.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </span>
      <span>{TOKS_LABEL}</span>
    </Link>
  );
}
