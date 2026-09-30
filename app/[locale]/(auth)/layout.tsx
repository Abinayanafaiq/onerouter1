import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/app/components/language-switcher";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Common");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" aria-label="9inference — beranda" className="flex shrink-0 items-center">
            <img
              src="/ChatGPT%20Image%20Oct%201%2C%202026%2C%2012_18_30%20AM.png"
              alt="9inference"
              width={144}
              height={48}
              className="h-auto w-28 object-contain sm:w-36"
            />
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <LanguageSwitcher />
            <Link href="/" className="hover:text-foreground">
              {t("home")}
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 glow-bg">{children}</main>
    </div>
  );
}
