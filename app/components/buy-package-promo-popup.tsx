"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * Popup promo "Beli Paket lebih murah" untuk pengguna dashboard.
 *
 * Menampilkan paket dengan nilai terbaik (highlight dari admin, atau token
 * per rupiah tertinggi) supaya user sadar ada alternatif yang lebih hemat
 * dibanding terus memakai saldo PAYG.
 *
 * Frekuensi (sengaja tidak agresif):
 * - Muncul sekali per SNOOZE_MS (24 jam) per browser, dengan delay kecil
 *   setelah halaman termuat agar tidak menumpuk popup lain.
 * - Tidak tampil di halaman yang sudah berkaitan dengan pembelian paket
 *   (/dashboard/beli-paket, /checkout) — user sudah dalam alur beli.
 */
const DISMISS_KEY = "9i_package_promo_dismissed_until";
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24 jam
const SHOW_DELAY_MS = 3000;
const EXCLUDED_PREFIXES = ["/dashboard/beli-paket", "/checkout"];

export type PromoPackage = {
  id: string;
  name: string;
  price: number;
  quotaTokens: number;
};

export function BuyPackagePromoPopup({ bestPackage }: { bestPackage: PromoPackage | null }) {
  const t = useTranslations("Popups");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!bestPackage) return;
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;
    try {
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() < dismissedUntil) return;
    } catch {
      // localStorage tidak tersedia — tetap tampilkan.
    }
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [bestPackage, pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !bestPackage) return null;

  /** Tutup + tidur 24 jam. */
  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      // ignore
    }
  };

  const quotaMillions = (bestPackage.quotaTokens / 1_000_000).toLocaleString(locale, {
    maximumFractionDigits: 1,
  });
  const perMillion =
    bestPackage.quotaTokens > 0
      ? Math.round(bestPackage.price / (bestPackage.quotaTokens / 1_000_000))
      : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("promoAriaLabel")}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-accent/20 bg-neutral-950 p-6 shadow-2xl animate-fade-up">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/[0.10] blur-3xl" />

        <div className="relative flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9ZM4 7.5l8 4.5 8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              {t("promoBadge")}
            </span>
            <h2 className="mt-2 text-base font-semibold text-neutral-100">
              {t("promoTitle")}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-400">
              {t.rich("promoBody", {
                b: (chunks) => <span className="font-medium text-neutral-200">{chunks}</span>,
                accent: (chunks) => <span className="font-medium text-accent">{chunks}</span>,
                name: bestPackage.name,
                quota: quotaMillions,
                price: bestPackage.price.toLocaleString(locale),
              })}
              {perMillion !== null && (
                <>{" "}{t.rich("promoPerMillion", {
                  b: (chunks) => <span className="font-medium text-neutral-200">{chunks}</span>,
                  amount: perMillion.toLocaleString(locale),
                })}</>
              )}
              .
            </p>
          </div>
        </div>

        <ul className="relative mt-4 space-y-2 text-[12px] text-neutral-400">
          <li className="flex gap-2">
            <span className="text-accent">✓</span>
            {t("promoBullet1")}
          </li>
          <li className="flex gap-2">
            <span className="text-accent">✓</span>
            {t("promoBullet2")}
          </li>
        </ul>

        <div className="relative mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-neutral-500 transition hover:text-neutral-300"
          >
            {t("promoLater")}
          </button>
          <Link
            href="/dashboard/beli-paket"
            onClick={dismiss}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            {t("promoCta")}
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
