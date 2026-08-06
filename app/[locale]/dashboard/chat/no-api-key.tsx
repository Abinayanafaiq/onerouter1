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
    <div className="border rounded-lg p-6 text-center space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          {t("noActiveKey")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t.rich("noActiveKeyHint", {
            link: (chunks) => (
              <Link href="/dashboard/api-keys" className="font-medium hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
      <button
        onClick={generateAndRefresh}
        disabled={generating}
        className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {generating ? t("generating") : t("generateApiKey")}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
