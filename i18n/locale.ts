import type { AppLocale } from "./routing";
import { locales, routing } from "./routing";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Indonesia → id, semua negara lain → en */
export function localeFromCountry(country: string | null | undefined): AppLocale {
  if (!country) return routing.defaultLocale;
  return country.toUpperCase() === "ID" ? "id" : "en";
}

export function detectCountry(headers: Headers): string | null {
  return (
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    headers.get("cloudfront-viewer-country") ||
    null
  );
}

export function localeLabel(locale: AppLocale): string {
  return locale === "id" ? "ID" : "EN";
}
