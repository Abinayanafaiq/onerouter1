"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Shown when the user has zero active API keys. Provides an inline "Generate"
 * button so the user can create a key without leaving the chat page — the
 * page refreshes immediately via router.refresh(), which re-runs the server
 * component and picks up the new key.
 */
export function NoApiKey() {
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
        setError(data.error || "Failed to generate key");
      }
    } catch {
      setError("Connection failed");
    }
    setGenerating(false);
  }

  return (
    <div className="border rounded-lg p-6 text-center space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Anda belum punya API key aktif.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Generate satu sekarang untuk mulai chat, atau kelola key di{" "}
          <Link href="/dashboard/api-keys" className="font-medium hover:underline">API Keys</Link>.
        </p>
      </div>
      <button
        onClick={generateAndRefresh}
        disabled={generating}
        className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {generating ? "Generating..." : "+ Generate API Key"}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
