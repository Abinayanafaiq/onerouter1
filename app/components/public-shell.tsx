import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/app/components/site-header";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Footer");
  const tc = await getTranslations("Common");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {children}
      <footer className="border-t border-white/[0.06] px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm font-semibold">9inference</div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
          </div>
          <FooterCol
            title={t("product")}
            links={[
              { label: t("aiModels"), href: "/models" },
              { label: t("tokenPricing"), href: "/pricing" },
              { label: tc("blog"), href: "/blog" },
              { label: tc("registerShort"), href: "/register" },
            ]}
          />
          <FooterCol
            title={t("learn")}
            links={[
              { label: t("apiCheap"), href: "/blog/api-model-ai-murah-indonesia" },
              { label: t("deepseekCheap"), href: "/blog/deepseek-api-murah-cara-pakai" },
              { label: t("openaiAlt"), href: "/blog/alternatif-openai-api-murah" },
              { label: t("payPerToken"), href: "/blog/bayar-per-token-vs-langganan" },
            ]}
          />
          <FooterCol
            title={t("account")}
            links={[
              { label: tc("login"), href: "/login" },
              { label: tc("dashboard"), href: "/dashboard" },
              { label: tc("wallet"), href: "/dashboard/wallet" },
            ]}
          />
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-[12px] text-muted-foreground">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href as "/"}
              className="text-[13px] text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
