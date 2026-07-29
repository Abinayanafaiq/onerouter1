"use client";

import { useState } from "react";

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
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    if (
      !confirm(
        "Regenerasi API key? Key lama langsung tidak berlaku dan harus diganti di aplikasi Anda. Kuota dan masa aktif paket tetap sama.",
      )
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
        setError(data.error || "Gagal melakukan regenerasi.");
      }
    } catch {
      setError("Koneksi gagal. Coba lagi.");
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
            Key baru tersimpan — mulai sekarang bisa ditampilkan kapan saja.
          </span>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:text-foreground"
          >
            {copied ? "✓ Tersalin" : "Salin"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <code className="block text-[11px] text-muted-foreground">{maskedKey}</code>
      <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
        Key asli tidak tersimpan (pernah di-regenerate), jadi tidak bisa ditampilkan.
      </p>
      <button
        type="button"
        onClick={regenerate}
        disabled={busy}
        className="mt-2 rounded-md border border-accent/25 bg-accent/[0.08] px-2.5 py-1 text-[10px] font-medium text-accent transition hover:bg-accent/[0.14] disabled:opacity-50"
      >
        {busy ? "Memproses…" : "Regenerasi Key Baru"}
      </button>
      {error && <p className="mt-1.5 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
