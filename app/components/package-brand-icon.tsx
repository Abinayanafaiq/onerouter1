const brandIcons: Record<string, string> = {
  glm: "chatglm-color.svg",
  kimi: "kimi-color.svg",
  deepseek: "deepseek-color.svg",
};

export function PackageBrandIcon({ group, className = "h-5 w-5" }: { group: string; className?: string }) {
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
