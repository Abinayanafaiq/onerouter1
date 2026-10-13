import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicShell } from "@/app/components/public-shell";
import { BreadcrumbJsonLd } from "@/app/components/breadcrumb-json-ld";
import {
  getStatusData,
  STATUS_HISTORY_DAYS,
  type ModelStatus,
  type ServiceState,
} from "@/app/lib/status";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("statusTitle"),
    description: t("statusDescription"),
    alternates: {
      canonical: `/${locale}/status`,
      languages: { "id-ID": "/id/status", "en-US": "/en/status", "x-default": "/id/status" },
    },
    openGraph: {
      title: `${t("statusTitle")} | 9inference`,
      description: t("statusDescription"),
      url: `/${locale}/status`,
    },
  };
}

const stateStyles: Record<ServiceState, { badge: string; dot: string; key: string }> = {
  operational: { badge: "border-accent/25 bg-accent/10 text-accent", dot: "bg-accent", key: "stOperational" },
  degraded: { badge: "border-amber-400/25 bg-amber-400/10 text-amber-200", dot: "bg-amber-300", key: "stDegraded" },
  outage: { badge: "border-red-400/25 bg-red-400/10 text-red-300", dot: "bg-red-400", key: "stOutage" },
  maintenance: { badge: "border-sky-400/25 bg-sky-400/10 text-sky-200", dot: "bg-sky-300", key: "stMaintenance" },
  nodata: { badge: "border-white/10 bg-white/[0.03] text-muted-foreground", dot: "bg-white/25", key: "stNoData" },
};

const overallStyles = {
  operational: { box: "border-accent/30 bg-accent/[0.06]", dot: "bg-accent", key: "overallOperational" },
  degraded: { box: "border-amber-400/30 bg-amber-400/[0.06]", dot: "bg-amber-300", key: "overallDegraded" },
  outage: { box: "border-red-400/30 bg-red-400/[0.06]", dot: "bg-red-400", key: "overallOutage" },
} as const;

function dayColor(uptime: number | null) {
  if (uptime === null) return "bg-white/[0.08]";
  if (uptime >= 0.98) return "bg-accent/80";
  return uptime >= 0.9 ? "bg-amber-300/80" : "bg-red-400/80";
}

// Dibulatkan ke bawah supaya 99,996% tidak tampil sebagai 100%.
function formatPercent(value: number, locale: string) {
  return `${(Math.floor(value * 10_000) / 100).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Status");
  const tc = await getTranslations("Common");
  const status = await getStatusData();
  const overall = overallStyles[status.overall];
  const updatedAt = new Date(status.updatedAt).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  });

  const renderGroup = (title: string, desc: string, models: ModelStatus[]) => (
    <section className="mt-12">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{desc}</p>
      {models.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {models.map((m) => {
            const style = stateStyles[m.state];
            return (
              <li key={m.modelId} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold tracking-tight">{m.name}</h3>
                    <code className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">{m.modelId}</code>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${style.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
                    {t(style.key)}
                  </span>
                </div>

                <div className="mt-4 flex h-8 items-stretch gap-[3px]" role="img" aria-label={t("historyLabel", { days: STATUS_HISTORY_DAYS })}>
                  {m.days.map((d) => (
                    <span
                      key={d.date}
                      title={`${d.date} · ${d.uptime === null ? t("noDataDay") : formatPercent(d.uptime, locale)}`}
                      className={`flex-1 rounded-sm ${dayColor(d.uptime)}`}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                  <span>{t("daysAgo", { days: STATUS_HISTORY_DAYS })}</span>
                  <span>{t("today")}</span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 text-[12px]">
                  <div>
                    <dt className="text-muted-foreground">{t("uptime30", { days: STATUS_HISTORY_DAYS })}</dt>
                    <dd className="mt-0.5 text-base font-semibold">
                      {m.uptime30d === null ? "—" : formatPercent(m.uptime30d, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("medianDuration")}</dt>
                    <dd className="mt-0.5 text-base font-semibold">
                      {m.medianMs === null
                        ? "—"
                        : t("seconds", {
                            value: (m.medianMs / 1000).toLocaleString(locale, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            }),
                          })}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <PublicShell>
      <BreadcrumbJsonLd
        items={[
          { name: tc("home"), path: `/${locale}` },
          { name: t("title"), path: `/${locale}/status` },
        ]}
      />

      <section className="px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{t("eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-4 text-base text-muted-foreground">{t("subtitle")}</p>

          <div className={`mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5 ${overall.box}`}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${overall.dot}`} />
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${overall.dot}`} />
              </span>
              <span className="text-base font-semibold tracking-tight">{t(overall.key)}</span>
            </div>
            <span className="text-[12px] text-muted-foreground">{t("updatedAt", { time: updatedAt })}</span>
          </div>

          {renderGroup(t("paygTitle"), t("paygDesc"), status.payg)}
          {renderGroup(t("paketTitle"), t("paketDesc"), status.paket)}

          <div className="mt-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold tracking-tight">{t("methodTitle")}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t("methodBody")}</p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
