"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import type { AppLocale } from "@/i18n/routing";
import { LOCALE_COOKIE } from "@/i18n/locale";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: AppLocale) {
    if (next === locale || pending) return;
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => {
      router.replace(pathname, { locale: next });
      router.refresh();
    });
  }

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-white/10 bg-white/[0.02] p-0.5 text-[11px] font-semibold ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => switchTo("id")}
        className={`rounded-md px-2 py-1 transition ${
          locale === "id"
            ? "bg-white/10 text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        ID
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => switchTo("en")}
        className={`rounded-md px-2 py-1 transition ${
          locale === "en"
            ? "bg-white/10 text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
