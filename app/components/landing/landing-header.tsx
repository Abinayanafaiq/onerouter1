"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/app/components/language-switcher";

export function LandingHeader({ isAuthed }: { isAuthed: boolean }) {
  const t = useTranslations();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: t("Nav.models"), href: "/models" as const },
    { label: t("Nav.pricing"), href: "/pricing" as const },
    { label: t("Nav.blog"), href: "/blog" as const },
    { label: t("Nav.platform"), href: "/#platform" as const },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/[0.06] bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-[11px] font-bold text-background">
            9i
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">9inference</div>
            <div className="hidden text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
              {t("Header.tagline")}
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition hover:text-foreground hover:bg-white/[0.03]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          {isAuthed ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
              >
                {t("Common.dashboard")}
              </Link>
              <Link
                href="/dashboard"
                className="btn-accent rounded-lg px-4 py-2 text-[13px]"
              >
                {t("Common.openConsole")}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
              >
                {t("Common.login")}
              </Link>
              <Link
                href="/register"
                className="btn-accent rounded-lg px-4 py-2 text-[13px]"
              >
                {t("Common.register")}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-muted-foreground"
            aria-label={t("Header.toggleMenu")}
            aria-expanded={open}
          >
            {open ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto max-w-7xl space-y-1 px-4 py-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-white/[0.03] hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-white/[0.06] pt-3">
              {isAuthed ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="btn-accent rounded-lg px-4 py-2.5 text-center text-sm"
                >
                  {t("Common.openConsole")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-foreground"
                  >
                    {t("Common.login")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="btn-accent rounded-lg px-4 py-2.5 text-center text-sm"
                  >
                    {t("Common.register")}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
