import { getLocale, getTranslations } from "next-intl/server";
import { listPublishedAnnouncements, type AnnouncementLevel } from "@/app/lib/announcements";
import { AnnouncementsSeenProvider, NewAnnouncementBadge } from "./mark-seen";

export const dynamic = "force-dynamic";

const LEVEL_STYLES: Record<AnnouncementLevel, { dot: string; badge: string; border: string }> = {
  info: {
    dot: "bg-sky-400",
    badge: "text-sky-300 border-sky-500/30 bg-sky-500/10",
    border: "before:bg-sky-400/70",
  },
  success: {
    dot: "bg-accent",
    badge: "text-accent border-accent/30 bg-accent/10",
    border: "before:bg-accent/70",
  },
  warning: {
    dot: "bg-amber-400",
    badge: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    border: "before:bg-amber-400/70",
  },
  critical: {
    dot: "bg-red-400",
    badge: "text-red-300 border-red-500/30 bg-red-500/10",
    border: "before:bg-red-400/70",
  },
};

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Render teks polos dengan link https:// yang bisa diklik. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 break-all hover:opacity-80"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default async function AnnouncementsPage() {
  const [t, locale, announcements] = await Promise.all([
    getTranslations("Announcements"),
    getLocale(),
    listPublishedAnnouncements(),
  ]);

  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });

  // Urutan list = disematkan dulu, jadi item pertama belum tentu yang terbaru.
  const latestAt = announcements.reduce<string | null>(
    (m, a) => (m === null || a.createdAt > m ? a.createdAt : m),
    null,
  );

  return (
    <AnnouncementsSeenProvider latest={latestAt}>
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="animate-fade-up">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        {announcements.length === 0 ? (
          <section className="glass animate-fade-up-delay-1 rounded-2xl p-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-muted-foreground">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Zm13-3a5 5 0 0 1 0 8m2.5-10.5a8.5 8.5 0 0 1 0 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="mt-4 text-sm font-semibold">{t("emptyTitle")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("emptyDesc")}</p>
          </section>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => {
              const s = LEVEL_STYLES[a.level];
              return (
                <article
                  key={a.id}
                  className={`glass animate-fade-up-delay-1 relative overflow-hidden rounded-2xl p-6 before:absolute before:inset-y-0 before:left-0 before:w-[3px] ${s.border}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {t(`level.${a.level}`)}
                    </span>
                    <NewAnnouncementBadge createdAt={a.createdAt} label={t("new")} />
                    {a.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                          <path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        </svg>
                        {t("pinned")}
                      </span>
                    )}
                    <time dateTime={a.createdAt} className="ml-auto text-[11px] text-muted-foreground">
                      {fmt.format(new Date(a.createdAt))}
                    </time>
                  </div>
                  <h2 className="mt-3 text-base font-semibold tracking-tight text-foreground">{a.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                    <Linkified text={a.body} />
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AnnouncementsSeenProvider>
  );
}
