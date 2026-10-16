import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/app/components/language-switcher";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

const LOGO_SRC = "/ChatGPT%20Image%20Oct%201%2C%202026%2C%2012_18_30%20AM.png";

/**
 * Layout auth split-screen: panel brand (desktop) di kiri, form di kanan.
 * Semua klaim di panel diambil dari copy landing yang sudah berlaku
 * (tanpa langganan, refund 14 hari, dsb.) — jangan tambah angka/testimoni
 * yang tidak bisa dibuktikan.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Auth");
  const tc = await getTranslations("Common");

  const points = [t("panelPoint1"), t("panelPoint2"), t("panelPoint3"), t("panelPoint4")];
  const trust = [
    { icon: <ShieldIcon />, label: t("trustTurnstile") },
    { icon: <LockIcon />, label: t("trustHash") },
    { icon: <MailCheckIcon />, label: t("trustEmail") },
    { icon: <GlobeLockIcon />, label: t("trustHttps") },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Backdrop: grid halus + glow lime/emerald */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_70%_60%_at_30%_30%,#000_20%,transparent_75%)]" />
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[rgba(184,255,69,0.10)] blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-120px] h-[520px] w-[520px] rounded-full bg-[rgba(22,217,122,0.08)] blur-[140px]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* ── Brand panel (desktop) ───────────────────────────── */}
        <aside className="relative hidden lg:flex flex-col justify-between gap-10 border-r border-white/[0.06] px-12 py-10 xl:px-16 xl:py-12">
          <Link href="/" aria-label="9inference — beranda" className="flex w-fit items-center">
            <img src={LOGO_SRC} alt="9inference" width={144} height={48} className="h-auto w-36 object-contain" />
          </Link>

          <div className="max-w-xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(184,255,69,0.22)] bg-[rgba(184,255,69,0.06)] px-3 py-1 text-xs font-medium text-[#d9ff9c]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b8ff45] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#b8ff45]" />
              </span>
              {t("panelEyebrow")}
            </span>

            <h2 className="landing-display mt-6 text-[44px] xl:text-[52px] font-semibold leading-[1.02]">
              <span className="gradient-text">{t("panelTitle1")}</span>
              <br />
              <span className="gradient-text-accent">{t("panelTitle2")}</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              {t("panelDesc")}
            </p>

            <ul className="mt-8 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-neutral-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(184,255,69,0.12)] text-[#b8ff45] ring-1 ring-[rgba(184,255,69,0.25)]">
                    <CheckIcon />
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            {/* Snippet kode — menegaskan "drop-in OpenAI" */}
            <div className="mt-9 overflow-hidden rounded-xl [@media(max-height:960px)]:hidden border border-white/[0.08] bg-[#0b0c0a]/80 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur">
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="ml-2 font-mono text-[11px] text-neutral-500">client.py</span>
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-6 text-neutral-400">
                <code>
                  <span className="text-[#c792ea]">from</span> openai <span className="text-[#c792ea]">import</span> OpenAI{"\n\n"}
                  client = OpenAI({"\n"}
                  {"    "}base_url=<span className="text-[#b8ff45]">&quot;https://9inference.cloud/v1&quot;</span>,{"\n"}
                  {"    "}api_key=<span className="text-[#b8ff45]">&quot;sk-…&quot;</span>,{"\n"}
                  )
                </code>
              </pre>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {t("trustTitle")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5 max-w-lg">
              {trust.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-neutral-400">
                  <span className="text-[#b8ff45]/80">{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
            <p className="mt-8 text-[11px] text-neutral-600">
              © {new Date().getFullYear()} 9inference. {t("rights")}
            </p>
          </div>
        </aside>

        {/* ── Form side ───────────────────────────────────────── */}
        <div className="relative flex min-h-screen flex-col">
          <header className="flex h-16 items-center justify-between px-4 sm:px-8">
            <Link href="/" aria-label="9inference — beranda" className="flex shrink-0 items-center lg:invisible">
              <img src={LOGO_SRC} alt="9inference" width={144} height={48} className="h-auto w-28 object-contain sm:w-32" />
            </Link>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <LanguageSwitcher />
              <Link href="/" className="transition hover:text-foreground">
                {tc("home")}
              </Link>
            </div>
          </header>

          <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
            {children}
          </main>

          {/* Trust row ringkas untuk mobile/tablet (panel brand tersembunyi) */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 pb-8 lg:hidden">
            {trust.slice(0, 3).map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                <span className="text-[#b8ff45]/70">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function CheckIcon() {
  return (
    <svg {...iconProps} width={12} height={12} strokeWidth={3}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function MailCheckIcon() {
  return (
    <svg {...iconProps}>
      <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      <path d="m16 19 2 2 4-4" />
    </svg>
  );
}

function GlobeLockIcon() {
  return (
    <svg {...iconProps}>
      <path d="M15.686 15A14.5 14.5 0 0 1 12 22a14.5 14.5 0 0 1 0-20 10 10 0 1 0 9.542 13" />
      <path d="M2 12h8.5" />
      <path d="M20 6V4a2 2 0 1 0-4 0v2" />
      <rect x="14" y="6" width="8" height="5" rx="1" />
    </svg>
  );
}
