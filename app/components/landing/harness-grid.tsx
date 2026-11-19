import { Link } from "@/i18n/navigation";

/**
 * Dinding logo harness / coding agent / SDK yang bisa memakai API key
 * 9inference — gaya deretan logo pelanggan di baseten.co.
 * Daftar ini mengikuti panduan di /dashboard/docs: OpenCode, Zed,
 * DeepSeek Harness, dan 9router punya tutorial langsung; Claude Code, Codex,
 * Cursor, dan Cline tersambung lewat 9router.
 */

type Harness = {
  name: string;
  logo: string;
  /** Logo putih/berwarna dibuat hitam; logo dengan latar sendiri cukup abu-abu. */
  filter?: "mono" | "gray";
  via?: string;
  tint?: "blue" | "green";
};

const HARNESSES: Harness[] = [
  { name: "OpenCode", logo: "/logos/harness/opencode.svg", tint: "blue" },
  { name: "Zed", logo: "/logos/zed.svg", filter: "mono" },
  { name: "DeepSeek Harness", logo: "/logos/deepseek-harness.svg", filter: "mono" },
  { name: "9router", logo: "/logos/9router.svg", filter: "gray" },
  { name: "Claude Code", logo: "/logos/harness/claudecode.svg", via: "9router" },
  { name: "Codex", logo: "/logos/harness/codex.svg", via: "9router" },
  { name: "Cursor", logo: "/logos/harness/cursor.svg", via: "9router" },
  { name: "Cline", logo: "/logos/harness/cline.svg", via: "9router", tint: "green" },
  { name: "OpenAI SDK", logo: "/logos/harness/openai.svg" },
  { name: "LangChain", logo: "/logos/harness/langchain.svg" },
  { name: "Vercel AI SDK", logo: "/logos/harness/vercel.svg" },
];

const TINTS = {
  blue: "bg-[#d4ebff]",
  green: "bg-[var(--lp-green-soft)]",
} as const;

export function HarnessGrid({ isEn, isAuthed }: { isEn: boolean; isAuthed: boolean }) {
  return (
    <div>
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="lp-label">{isEn ? "Supported harnesses & tools" : "Harness & tool yang didukung"}</span>
        <span className="text-[13px] text-muted-foreground">
          {isEn
            ? "Use your 9inference API key in your favorite coding agent or SDK."
            : "Pakai API key 9inference di coding agent & SDK favoritmu."}
        </span>
      </div>

      <ul className="lp-reveal grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 sm:gap-3 sm:p-3 lg:grid-cols-6">
        {HARNESSES.map((h) => (
          <li
            key={h.name}
            className={`group relative flex min-h-24 flex-col items-center justify-center gap-2 px-3 text-center transition-colors hover:bg-[var(--lp-green-soft)] sm:min-h-32 lg:min-h-36 ${
              h.tint ? TINTS[h.tint] : "bg-[var(--lp-pale)]"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <img
                src={h.logo}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className={`h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7 ${
                  h.filter === "mono" ? "brightness-0" : h.filter === "gray" ? "grayscale" : ""
                }`}
              />
              <span className="text-left text-[16px] leading-tight tracking-tight text-black sm:text-[19px]">{h.name}</span>
            </span>
            {h.via && (
              <span className="lp-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                via {h.via}
              </span>
            )}
          </li>
        ))}
        <li>
          <Link
            href={isAuthed ? "/dashboard/docs" : "/register"}
            className="flex h-full min-h-24 flex-col justify-between bg-black p-4 text-white transition-colors hover:bg-[var(--lp-green)] hover:text-black sm:min-h-32 lg:min-h-36"
          >
            <span className="lp-mono text-[10px] uppercase tracking-[0.06em] opacity-70">
              {isEn ? "+ any OpenAI-compatible tool" : "+ tool kompatibel OpenAI lain"}
            </span>
            <span className="flex items-end justify-between gap-3 text-[15px] leading-snug">
              {isAuthed
                ? isEn
                  ? "See setup guides"
                  : "Lihat panduan setup"
                : isEn
                  ? "Sign up & see setup guides"
                  : "Daftar & lihat panduan setup"}
              <span aria-hidden className="lp-caret mb-1.5" />
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
