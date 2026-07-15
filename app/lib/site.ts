/** Canonical public site URL for SEO, sitemap, and Open Graph. */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  return "https://onerouter.id";
}

export const SITE_NAME = "OneRouter";
export const SITE_TAGLINE = "Platform Inferensi AI — Satu API, Banyak Model";
export const SITE_DESCRIPTION =
  "Gateway inferensi AI siap produksi. API terpadu kompatibel OpenAI untuk GLM, DeepSeek, Qwen, Kimi & lainnya. Bayar per token, tanpa langganan.";
export const SITE_KEYWORDS = [
  "OneRouter",
  "API inferensi AI",
  "API kompatibel OpenAI",
  "LLM gateway",
  "GLM API",
  "DeepSeek API",
  "Qwen API",
  "Kimi API",
  "platform AI Indonesia",
  "bayar per token",
  "AI inference API",
  "OpenAI compatible API",
];
