"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Shell premium untuk halaman auth (login, register, lupa password).
 * Selaras dengan design system globals.css: glass card, glow edge,
 * gradient text, accent lime. Mobile-first: touch target >= 44px,
 * font input 16px di mobile supaya iOS tidak auto-zoom.
 */

export const authInputClass =
  "w-full h-12 rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 text-base sm:text-sm text-foreground placeholder:text-neutral-600 outline-none transition-[border-color,background-color,box-shadow] duration-200 hover:border-white/[0.16] focus:border-[rgba(184,255,69,0.5)] focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_rgba(184,255,69,0.10)]";

export const authLabelClass =
  "text-[13px] font-medium text-neutral-300 block mb-2";

export const authButtonClass =
  "btn-accent group relative w-full h-12 rounded-xl text-[15px] font-semibold inline-flex items-center justify-center gap-2 overflow-hidden disabled:opacity-60 disabled:pointer-events-none";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useTranslations("Auth");

  return (
    <div className="relative w-full max-w-[440px] animate-fade-up">
      {/* Halo lembut di belakang kartu */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-16 h-56 bg-[radial-gradient(50%_60%_at_50%_40%,rgba(184,255,69,0.14),transparent_70%)] blur-2xl"
      />

      <div className="glass glow-card relative overflow-hidden rounded-[22px] bg-[#0a0b09]/70 px-5 py-8 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.05)] sm:px-9 sm:py-10">
        {/* Garis aksen di tepi atas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(184,255,69,0.7)] to-transparent"
        />

        {/* Brand mark */}
        <div className="mb-7 flex justify-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c9ff6b] via-[#b8ff45] to-[#16d97a] text-xl font-black text-[#00120a] shadow-[0_10px_30px_-8px_rgba(184,255,69,0.55),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-[rgba(184,255,69,0.2)] ring-offset-4 ring-offset-[#0b0c0a]">
            9
          </span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="landing-display gradient-text text-[28px] font-semibold leading-tight sm:text-[32px]">
            {title}
          </h1>
          <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {children}
      </div>

      {footer && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-neutral-600">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {t("secureNote")}
      </p>
    </div>
  );
}

/* ── Field primitives ─────────────────────────────────────────── */

const fieldIconClass =
  "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors group-focus-within:text-[#b8ff45]";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Input dengan ikon di kiri (mail / user). Atribut input diteruskan apa adanya. */
export function AuthInput({
  icon,
  className = "",
  ...props
}: InputProps & { icon: "mail" | "user" | "key" }) {
  return (
    <div className="group relative">
      <span className={fieldIconClass}>{ICONS[icon]}</span>
      <input {...props} className={`${authInputClass} pl-10 ${className}`} />
    </div>
  );
}

/** Input password dengan ikon gembok + tombol tampilkan/sembunyikan. */
export function PasswordInput({ className = "", ...props }: Omit<InputProps, "type">) {
  const t = useTranslations("Auth");
  const [visible, setVisible] = useState(false);
  return (
    <div className="group relative">
      <span className={fieldIconClass}>{ICONS.lock}</span>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${authInputClass} pl-10 pr-11 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"
      >
        {visible ? ICONS.eyeOff : ICONS.eye}
      </button>
    </div>
  );
}

/** Kotak pesan error yang konsisten untuk semua form auth. */
export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3.5 py-3 text-sm text-red-300"
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}

/** Tombol submit utama: spinner saat pending, panah saat idle. */
export function AuthSubmit({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button type="submit" disabled={pending} className={authButtonClass}>
      {/* Kilau tipis saat hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100"
      />
      {pending ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {pendingLabel}
        </>
      ) : (
        <>
          {label}
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </>
      )}
    </button>
  );
}

/** Kotak info kuning (spam notice, 2FA admin, dsb.). */
export function AuthNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3.5 py-3">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      <div className="text-xs leading-relaxed text-amber-200/80">{children}</div>
    </div>
  );
}

/** Indikator langkah untuk register (Email → Kode → Password). */
export function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number; // 1-based
}) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-2 sm:gap-3">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && (
              <span className="relative h-px w-6 overflow-hidden rounded-full bg-white/10 sm:w-10">
                <span
                  className={`absolute inset-0 origin-left bg-gradient-to-r from-[#b8ff45] to-[#16d97a] transition-transform duration-500 ${
                    done || active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </span>
            )}
            <div className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition ${
                  done
                    ? "bg-gradient-to-br from-[#b8ff45] to-[#16d97a] text-[#00120a]"
                    : active
                      ? "border border-[#b8ff45] bg-[rgba(184,255,69,0.08)] text-[#b8ff45] shadow-[0_0_0_4px_rgba(184,255,69,0.08)]"
                      : "border border-white/15 text-neutral-600"
                }`}
              >
                {done ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  n
                )}
              </span>
              <span
                className={`text-[11px] font-medium sm:text-xs ${
                  active ? "text-foreground" : done ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                {label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const svg = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ICONS = {
  mail: (
    <svg {...svg}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  user: (
    <svg {...svg}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  key: (
    <svg {...svg}>
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </svg>
  ),
  lock: (
    <svg {...svg}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  eye: (
    <svg {...svg}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg {...svg}>
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.97 0 8.5 3.5 9.94 6.65a1 1 0 0 1 0 .7 10.8 10.8 0 0 1-1.44 2.49" />
      <path d="M14.08 14.16a3 3 0 0 1-4.24-4.24" />
      <path d="M17.48 17.5A10.7 10.7 0 0 1 12 19c-4.97 0-8.5-3.5-9.94-6.65a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.44-5.15" />
      <path d="m2 2 20 20" />
    </svg>
  ),
};
