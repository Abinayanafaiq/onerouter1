"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Compatibility notice for dashboard users.
 *
 * The 9inference /v1 endpoint only accepts standard OpenAI chat-completion
 * fields. Third-party tools that inject gateway-specific extras (e.g.
 * promptCacheKey, session_id, transforms) get HTTP 400 "Extra inputs are
 * not permitted" from upstream. This popup proactively tells users to use
 * opencode IDE instead of letting them discover the error the hard way.
 *
 * Frequency (intentionally persistent):
 * - Default: re-appears every REMIND_MS (1 menit) after being closed.
 * - "Jangan tampilkan lagi": snoozes the popup for SNOOZE_MS (24 jam),
 *   after which it starts appearing every minute again.
 */
const SNOOZE_KEY = "9i_compat_notice_snoozed_until";
const SHOWN_KEY = "9i_compat_notice_shown_at";
const REMIND_MS = 60 * 1000; // 1 menit
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24 jam

const UNSUPPORTED_FIELDS = [
  "promptCacheKey",
  "session_id",
  "transforms",
  "route",
  "provider",
  "usage",
  "reasoning",
  "modalities",
  "audio",
  "web_search_options",
  "verbosity",
  "cache_prompt",
  "safe_prompt",
  "chat_template_kwargs",
];

export function CompatNoticePopup() {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNext = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delay);
  }, []);

  useEffect(() => {
    try {
      const now = Date.now();
      const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      if (now < snoozedUntil) {
        // Masih dalam masa snooze 24 jam — bangun tepat saat snooze berakhir.
        scheduleNext(snoozedUntil - now + 100);
        return;
      }
      const lastShown = Number(localStorage.getItem(SHOWN_KEY) || 0);
      const elapsed = now - lastShown;
      if (elapsed < REMIND_MS) {
        // Baru saja tampil (mis. pindah halaman) — tunggu sisa 1 menitnya.
        scheduleNext(REMIND_MS - elapsed);
        return;
      }
      localStorage.setItem(SHOWN_KEY, String(now));
    } catch {
      // localStorage unavailable — tetap tampilkan.
    }
    setOpen(true);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleNext]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  /** Tutup biasa: popup muncul lagi 1 menit kemudian. */
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SHOWN_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    scheduleNext(REMIND_MS);
  };

  /** "Jangan tampilkan lagi": tidur 24 jam, lalu muncul tiap menit lagi. */
  const snooze = () => {
    setOpen(false);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
      localStorage.setItem(SHOWN_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    scheduleNext(SNOOZE_MS + 100);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Pemberitahuan kompatibilitas"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-neutral-950 p-6 shadow-2xl animate-fade-up">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M12 8v5m0 3.5h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-semibold text-neutral-100">
              Mengalami error aneh saat pakai tool/IDE pihak ketiga?
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-400">
              Endpoint 9inference hanya mendukung field request OpenAI standar.
              Field tambahan berikut <span className="text-neutral-200 font-medium">tidak didukung</span> dan
              menyebabkan error <code className="text-red-400">&quot;Extra inputs are not permitted&quot;</code> (HTTP 400):
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {UNSUPPORTED_FIELDS.map((f) => (
            <code
              key={f}
              className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono text-neutral-400"
            >
              {f}
            </code>
          ))}
        </div>

        <p className="mt-4 rounded-xl border border-accent/20 bg-accent/[0.06] p-3 text-[13px] leading-relaxed text-neutral-300">
          Solusi: gunakan <span className="font-semibold text-accent">opencode IDE</span> yang sudah
          kompatibel penuh dengan 9inference — tanpa error, tanpa konfigurasi tambahan.
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={snooze}
            className="text-xs text-neutral-500 transition hover:text-neutral-300"
          >
            Jangan tampilkan lagi (24 jam)
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
