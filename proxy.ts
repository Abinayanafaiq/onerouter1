import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing, type AppLocale } from "./i18n/routing";
import {
  detectCountry,
  isAppLocale,
  localeFromCountry,
  LOCALE_COOKIE,
} from "./i18n/locale";
import { isMaintenanceMode, maintenanceResponse } from "./app/lib/maintenance";

const intlMiddleware = createMiddleware(routing);

function pathnameLocale(pathname: string): AppLocale | null {
  const segment = pathname.split("/")[1];
  return isAppLocale(segment) ? segment : null;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMaintenanceMode()) {
    return maintenanceResponse(pathname);
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/v1") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const pathLocale = pathnameLocale(pathname);
  const hasValidCookie = isAppLocale(cookieLocale);

  // First visit (no cookie, no locale prefix): pick locale from geo country
  if (!pathLocale && !hasValidCookie) {
    const geoLocale = localeFromCountry(detectCountry(request.headers));
    const url = request.nextUrl.clone();
    url.pathname =
      pathname === "/" ? `/${geoLocale}` : `/${geoLocale}${pathname}`;
    const res = NextResponse.redirect(url);
    res.cookies.set(LOCALE_COOKIE, geoLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  // Ensure cookie tracks explicit locale in URL (user switched language)
  const response = intlMiddleware(request);
  if (pathLocale && pathLocale !== cookieLocale) {
    response.cookies.set(LOCALE_COOKIE, pathLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  } else if (!hasValidCookie) {
    const fallback =
      pathLocale ||
      localeFromCountry(detectCountry(request.headers));
    response.cookies.set(LOCALE_COOKIE, fallback, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  // /api dan /v1 ikut dicocokkan agar mode pemeliharaan juga menutup API.
  // Di luar pemeliharaan keduanya langsung diteruskan oleh proxy().
  matcher: ["/((?!_next|_vercel|.*\\..*).*)", "/api/:path*", "/v1/:path*"],
};
