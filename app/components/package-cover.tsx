import { PackageBrandIcon } from "./package-brand-icon";

const themes: Record<string, { base: string; glow: string; line: string; label: string }> = {
  glm: { base: "#10223b", glow: "#456fff", line: "#8db8ff", label: "GLM" },
  kimi: { base: "#1d1940", glow: "#7865e7", line: "#b7a9ff", label: "Kimi" },
  deepseek: { base: "#0c2948", glow: "#4d6bfe", line: "#87c6ff", label: "DeepSeek" },
  general: { base: "#183227", glow: "#6cca8a", line: "#bcff45", label: "AI" },
  other: { base: "#263047", glow: "#7e9dbf", line: "#bbd8ed", label: "AI" },
};

export function PackageCover({ group }: { group: string }) {
  const theme = themes[group] ?? themes.other;
  return (
    <div
      className="relative isolate h-44 overflow-hidden rounded-[1.4rem] sm:h-48"
      style={{ background: `radial-gradient(circle at 74% 23%, ${theme.glow}80, transparent 42%), linear-gradient(145deg, ${theme.base}, #080d19)` }}
      role="img"
      aria-label={`Ilustrasi paket ${theme.label}`}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`cover-line-${group}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={theme.line} stopOpacity="0.05" />
            <stop offset="0.55" stopColor={theme.line} stopOpacity="0.8" />
            <stop offset="1" stopColor={theme.line} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M -20 ${110 + i * 20} C 95 ${20 + i * 17}, 225 ${215 - i * 17}, 420 ${60 + i * 16}`} fill="none" stroke={`url(#cover-line-${group})`} strokeWidth={i === 2 ? 2 : 1} opacity={0.5 + i * 0.06} />
        ))}
        <circle cx="310" cy="107" r="68" fill="none" stroke={theme.line} strokeOpacity="0.18" />
        <circle cx="310" cy="107" r="98" fill="none" stroke={theme.line} strokeOpacity="0.08" />
        {[100, 170, 245, 342].map((x, i) => <circle key={x} cx={x} cy={[94, 148, 90, 147][i]} r="3" fill={theme.line} opacity="0.7" />)}
      </svg>
      <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 backdrop-blur-sm">
        <PackageBrandIcon group={group} className="h-5 w-5" />
        <span className="text-xs font-semibold text-white">{theme.label}</span>
      </div>
      <div className="absolute bottom-4 right-5 font-mono text-[10px] tracking-widest text-white/60">TOKEN / API</div>
    </div>
  );
}
