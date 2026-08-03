import { Link } from "@/i18n/navigation";

/**
 * Shell premium untuk halaman auth (login & register).
 * Selaras dengan design system globals.css: glass card, glow edge,
 * gradient text, accent lime. Mobile-first: touch target >= 44px,
 * font input 16px di mobile supaya iOS tidak auto-zoom.
 */

export const authInputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-base sm:text-sm text-foreground placeholder:text-neutral-600 outline-none transition focus:border-[rgba(184,255,69,0.45)] focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(184,255,69,0.12)]";

export const authLabelClass =
  "text-[13px] font-medium text-neutral-400 block mb-1.5";

export const authButtonClass =
  "btn-accent w-full h-11 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:pointer-events-none";

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
  return (
    <div className="relative w-full max-w-md animate-fade-up">
      <div className="glass glow-card rounded-2xl px-5 py-7 sm:px-8 sm:py-9">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#b8ff45] to-[#16d97a] text-[#00120a] font-black text-lg shadow-[0_6px_20px_-6px_rgba(184,255,69,0.5)]">
            9
          </span>
          <span className="font-bold text-lg tracking-tight">9inference</span>
        </div>

        <div className="text-center mb-7">
          <h1 className="gradient-text text-2xl sm:text-[28px] font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {children}
      </div>

      {footer && (
        <div className="mt-5 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}

      <p className="mt-6 text-center">
        <Link
          href="/"
          className="text-xs text-neutral-600 hover:text-neutral-400 transition"
        >
          ← 9inference.cloud
        </Link>
      </p>
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
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-7">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="flex items-center gap-1.5 sm:gap-2">
            {i > 0 && (
              <span
                className={`h-px w-4 sm:w-7 ${done || active ? "bg-[rgba(184,255,69,0.5)]" : "bg-white/10"}`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition ${
                  done
                    ? "bg-[#b8ff45] text-[#00120a]"
                    : active
                      ? "border border-[#b8ff45] text-[#b8ff45] shadow-[0_0_10px_rgba(184,255,69,0.35)]"
                      : "border border-white/15 text-neutral-600"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span
                className={`text-[10px] sm:text-xs font-medium ${
                  active ? "text-foreground" : done ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
