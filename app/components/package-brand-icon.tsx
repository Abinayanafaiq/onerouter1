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

/**
 * Logo resmi Anthropic (pembuat model Claude). Inline dengan currentColor
 * karena versi CDN berwarna hitam polos — diwarnai oranye khas Anthropic.
 */
function AnthropicLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" className={className}>
      <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
    </svg>
  );
}

export function PackageBrandIcon({ group, className = "h-5 w-5" }: { group: string; className?: string }) {
  if (group === "glm") return <GlmLogo className={`${className} text-white`} />;
  if (group === "claude") return <AnthropicLogo className={`${className} text-[#D97757]`} />;

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
