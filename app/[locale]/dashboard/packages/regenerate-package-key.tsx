"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Recovery control for package keys whose plaintext is no longer stored
 * (e.g. the key was regenerated before package keys kept their plaintext).
 * Regenerating mints a new secret — quota & expiry are preserved — and the
 * new plaintext is stored, so the regular show/hide control works from then
 * on. The fresh key is shown once here for immediate copying.
 */
export function RegeneratePackageKey({
  keyId,
  maskedKey,
}: {
  keyId: string;
  maskedKey: string;
}) {
  const t = useTranslations("MyPackages");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    if (
      !confirm(t("confirmRegenerate"))
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/keys/${keyId}/regenerate`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.plaintext) {
        setNewKey(data.plaintext as string);
      } else {
        setError(data.error || t("regenerateFailed"));
      }
    } catch {
      setError(t("connectionFailed"));
    }
    setBusy(false);
  }

  async function copy() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  if (newKey) {
    return (
      <div>
        <code className="block break-all font-mono text-[11px] text-accent">{newKey}</code>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-emerald-300">
            {t("newKeySaved")}
          </span>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:text-foreground"
          >
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <code className="block text-[11px] text-muted-foreground">{maskedKey}</code>
      <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
        {t("keyNotStored")}
      </p>
      <button
        type="button"
        onClick={regenerate}
        disabled={busy}
        className="mt-2 rounded-md border border-accent/25 bg-accent/[0.08] px-2.5 py-1 text-[10px] font-medium text-accent transition hover:bg-accent/[0.14] disabled:opacity-50"
      >
        {busy ? t("processing") : t("regenerateButton")}
      </button>
      {error && <p className="mt-1.5 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
