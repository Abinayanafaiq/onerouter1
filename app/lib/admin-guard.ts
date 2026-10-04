import { auth } from "@/app/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

/**
 * Wajib dipanggil di awal setiap admin page (server component) SEBELUM
 * query database apa pun. Layout saja TIDAK cukup: redirect() di layout
 * tidak mencegah payload RSC page (berisi data sensitif) ikut terkirim
 * ke client yang belum login.
 */
export async function requireAdmin() {
  const session = await auth();
  const locale = await getLocale();
  const user = session?.user;
  // redirect() selalu throw NEXT_REDIRECT saat runtime; tipe deklarasi
  // next-intl tidak menandai `never`, jadi pakai non-null assertion.
  if (!user) {
    redirect({ href: "/login", locale });
  }
  if (user!.role !== "ADMIN") {
    redirect({ href: "/dashboard", locale });
  }
  return user!;
}
