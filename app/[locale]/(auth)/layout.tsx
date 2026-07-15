import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/app/components/language-switcher";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Common");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">
            9inference
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <LanguageSwitcher />
            <Link href="/" className="hover:text-foreground">
              {t("home")}
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
