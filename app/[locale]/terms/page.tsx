import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicShell } from "@/app/components/public-shell";
import { BreadcrumbJsonLd } from "@/app/components/breadcrumb-json-ld";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("termsTitle"),
    description: t("termsDescription"),
    alternates: {
      canonical: `/${locale}/terms`,
      languages: { "id-ID": "/id/terms", "en-US": "/en/terms", "x-default": "/id/terms" },
    },
    openGraph: {
      title: t("termsTitle"),
      description: t("termsDescription"),
      url: `/${locale}/terms`,
    },
  };
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Terms");
  const tc = await getTranslations("Common");

  return (
    <PublicShell>
      <BreadcrumbJsonLd
        items={[
          { name: tc("home"), path: `/${locale}` },
          { name: t("title"), path: `/${locale}/terms` },
        ]}
      />

      <section className="relative px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 15% 0%, rgba(184,255,69,0.06) 0%, transparent 60%), radial-gradient(50% 50% at 100% 0%, rgba(255,112,72,0.06) 0%, transparent 55%)",
          }}
          aria-hidden
        />

        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1.5 text-[12px] font-medium text-accent">
            {t("badge")}
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-[12px] text-muted-foreground">{t("updated")}</p>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            {t("intro")}
          </p>

          <div className="mt-12 space-y-5">
            {/* 1. Penerimaan Ketentuan */}
            <article className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {t("acceptTitle")}
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                {t("acceptBody")}
              </p>
            </article>

            {/* 2. Kebijakan Refund */}
            <article className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {t("refundTitle")}
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                {t("refundIntro")}
              </p>
              <ul className="mt-4 space-y-3">
                {(["refundPoint1", "refundPoint2", "refundPoint3"] as const).map((key) => (
                  <li key={key} className="flex gap-3 text-[14px] leading-relaxed text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-accent">
                      <CheckIcon />
                    </span>
                    {t(key)}
                  </li>
                ))}
              </ul>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                    {t("refundFeeLabel")}
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-foreground">8%</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {t("refundFeeDesc")}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("refundChannelLabel")}
                  </div>
                  <div className="mt-1.5 text-lg font-bold text-foreground">
                    DANA · GoPay · {t("refundChannelBank")}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {t("refundChannelDesc")}
                  </div>
                </div>
              </div>
              <p className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-[13px] leading-relaxed text-muted-foreground">
                {t("refundNote")}
              </p>
            </article>

            {/* 3. Perubahan Harga Model */}
            <article className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {t("pricingTitle")}
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                {t("pricingBody1")}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                {t("pricingBody2")}
              </p>
            </article>

            {/* 4. Syarat Refund: Nomor WhatsApp */}
            <article className="glass rounded-2xl border-accent-2/25 p-6 sm:p-8">
              <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-accent-2">
                  <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("waTitle")}
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                {t("waBody1")}
              </p>
              <p className="mt-3 text-[14px] font-semibold leading-relaxed text-foreground">
                {t("waBody2")}
              </p>
              <p className="mt-5 rounded-xl border border-accent-2/25 bg-accent-2/5 p-4 text-[13px] leading-relaxed text-muted-foreground">
                {t("waNote")}
              </p>
            </article>

            {/* Penutup */}
            <div className="rounded-2xl border border-white/[0.08] p-6 text-[14px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">{t("questionsTitle")}</span>{" "}
              {t("questionsBody")}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
