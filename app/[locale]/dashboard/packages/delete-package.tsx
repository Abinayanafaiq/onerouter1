"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Hapus satu paket dari daftar "Paket Saya". Hanya untuk paket yang sudah
 * kedaluwarsa / kuotanya habis — server menolak (409) paket yang masih punya
 * sisa kuota. Server melakukan soft delete: kartunya hilang, tapi riwayat
 * order & pemakaian tetap tersimpan.
 */
export function DeletePackageButton({
  keyId,
  name,
}: {
  keyId: string;
  name: string;
}) {
  const t = useTranslations("MyPackages");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(t("confirmDelete", { name }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/keys/${keyId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || t("deleteFailed"));
      }
    } catch {
      alert(t("connectionFailed"));
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      title={t("deleteButton")}
      aria-label={t("deleteButton")}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** Hapus sekaligus semua paket yang kedaluwarsa / kuota habis / nonaktif. */
export function CleanupPackagesButton({ count }: { count: number }) {
  const t = useTranslations("MyPackages");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cleanup() {
    if (!confirm(t("confirmCleanup", { count }))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/keys/packages/cleanup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || t("deleteFailed"));
      }
    } catch {
      alert(t("connectionFailed"));
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={cleanup}
      disabled={busy}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-1.5 text-[11px] font-medium text-red-300 transition hover:border-red-400/40 hover:bg-red-400/[0.12] disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {busy ? t("processing") : t("cleanupButton", { count })}
    </button>
  );
}
