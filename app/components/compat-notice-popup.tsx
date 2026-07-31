"use client";

import { useEffect, useState } from "react";

/**
 * One-a-day compatibility notice for dashboard users.
 *
 * The 9inference /v1 endpoint only accepts standard OpenAI chat-completion
 * fields. Third-party tools that inject gateway-specific extras (e.g.
 * promptCacheKey, session_id, transforms) get HTTP 400 "Extra inputs are
 * not permitted" from upstream. This popup proactively tells users to use
 * opencode IDE instead of letting them discover the error the hard way.
 *
 * Frequency: shown at most once per 24h (localStorage timestamp), unless the
 * user picks "Jangan ingatkan lagi" which dismisses it permanently.
 */
const DISMISS_KEY = "9i_compat_notice_dismissed";
const SHOWN_KEY = "9i_compat_notice_shown_at";
const DAY_MS = 24 * 60 * 60 * 1000;

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

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      const lastShown = Number(localStorage.getItem(SHOWN_KEY) || 0);
      if (Date.now() - lastShown < DAY_MS) return;
      localStorage.setItem(SHOWN_KEY, String(Date.now()));
      setOpen(true);
    } catch {
      // localStorage unavailable (private mode etc.) — fail silent.
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const dismissForever = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
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
            onClick={dismissForever}
            className="text-xs text-neutral-500 transition hover:text-neutral-300"
          >
            Jangan ingatkan lagi
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
