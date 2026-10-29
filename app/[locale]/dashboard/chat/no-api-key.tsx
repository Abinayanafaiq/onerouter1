"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Shown when the user has zero active API keys. Provides an inline "Generate"
 * button so the user can create a key without leaving the chat page — the
 * page refreshes immediately via router.refresh(), which re-runs the server
 * component and picks up the new key.
 */
export function NoApiKey() {
  const t = useTranslations("Chat");
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateAndRefresh() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Chat Playground" }),
      });
      const data = await res.json();
      if (data.success) {
        // Re-run the server component so it re-queries and finds the new key.
        router.refresh();
      } else {
        setError(data.error || t("generateKeyFailed"));
      }
    } catch {
      setError(t("generateKeyConnectionFailed"));
    }
    setGenerating(false);
  }

  return (
    <div className="glass flex flex-col items-center gap-4 rounded-2xl p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="m11 12 9-9m-3 3 3 3m-6 0 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {t("noActiveKey")}
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {t.rich("noActiveKeyHint", {
            link: (chunks) => (
              <Link href="/dashboard/api-keys" className="font-medium text-foreground hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
      <button
        onClick={generateAndRefresh}
        disabled={generating}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
      >
        {generating ? t("generating") : t("generateApiKey")}
      </button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
