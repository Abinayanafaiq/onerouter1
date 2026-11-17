"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/app/components/language-switcher";

const brandLogo = "/ChatGPT%20Image%20Oct%201%2C%202026%2C%2012_18_30%20AM.png";

function Caret() {
  return <span aria-hidden className="lp-caret" />;
}

export function LandingHeader({ isAuthed }: { isAuthed: boolean }) {
  const t = useTranslations();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: t("Nav.packages"), href: "/#paket" as const },
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
      className={`fixed inset-x-0 top-0 z-50 bg-white transition-shadow duration-200 ${
        scrolled ? "shadow-[0_1px_0_0_var(--lp-line)]" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" aria-label="9inference — beranda" className="flex shrink-0 items-center">
            <img src={brandLogo} alt="9inference" className="h-auto w-28 object-contain sm:w-32" />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[14px] text-black transition hover:text-[var(--muted-foreground)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher className="lp-lang" />
          {isAuthed ? (
            <>
              <Link href="/dashboard" className="lp-btn-ghost h-9 px-4 text-[13px]">
                {t("Common.dashboard")}
              </Link>
              <Link href="/dashboard" className="lp-btn h-9 px-4 text-[13px]">
                {t("Common.openConsole")}
                <Caret />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="lp-btn-ghost h-9 px-4 text-[13px]">
                {t("Common.login")}
              </Link>
              <Link href="/register" className="lp-btn h-9 px-4 text-[13px]">
                {t("Common.register")}
                <Caret />
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher className="lp-lang" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-12 items-center justify-center bg-black text-white"
            aria-label={t("Header.toggleMenu")}
            aria-expanded={open}
          >
            {open ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M3 8h18M3 12h18M3 16h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--lp-line)] bg-white lg:hidden">
          <nav className="mx-auto max-w-[1320px] px-4 pb-5 pt-2">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-[var(--lp-line)] py-3.5 text-[15px] text-black"
              >
                {l.label}
                <Caret />
              </Link>
            ))}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {isAuthed ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="lp-btn col-span-2 h-11 px-4 text-sm"
                >
                  {t("Common.openConsole")}
                  <Caret />
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="lp-btn-ghost h-11 px-4 text-sm">
                    {t("Common.login")}
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="lp-btn h-11 px-4 text-sm">
                    {t("Common.register")}
                    <Caret />
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
