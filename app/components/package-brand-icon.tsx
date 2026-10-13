const brandIcons: Record<string, string> = {
  kimi: "kimi-color.svg",
  deepseek: "deepseek-color.svg",
  gemini: "gemini-color.svg",
  qwen: "qwen-color.svg",
};

/**
 * Logo resmi Z.ai (pembuat model GLM, dulu Zhipu AI). Digambar inline dengan
 * currentColor supaya tetap terlihat di latar gelap — versi SVG dari CDN
 * berwarna hitam polos.
 */
function GlmLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" className={className}>
      <path d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z" />
    </svg>
  );
}

export function PackageBrandIcon({ group, className = "h-5 w-5" }: { group: string; className?: string }) {
  if (group === "glm") return <GlmLogo className={`${className} text-white`} />;

  const icon = brandIcons[group];
  if (!icon) return <span aria-hidden="true" className={className}>✦</span>;

  return (
    <img
      src={`https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.95.1/icons/${icon}`}
      alt=""
      aria-hidden="true"
      width={24}
      height={24}
      className={className}
    />
  );
}
