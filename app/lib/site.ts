/** Canonical public site URL for SEO, sitemap, and Open Graph. */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  return "https://9inference.cloud";
}

export const SITE_NAME = "9inference";
export const SITE_TAGLINE = "API Model AI Murah — Bayar Per Token";
export const SITE_DESCRIPTION =
  "API model AI murah di Indonesia. Gateway inferensi kompatibel OpenAI untuk DeepSeek, GLM, Qwen, Kimi & lainnya. Bayar per token (TOKS), tanpa langganan, harga transparan dalam rupiah.";
export const SITE_KEYWORDS = [
  "API model murah",
  "API model AI murah",
  "token AI murah",
  "DeepSeek API murah",
  "GLM API murah",
  "Qwen API murah",
  "Kimi API murah",
  "API AI Indonesia",
  "API kompatibel OpenAI",
  "alternatif OpenAI murah",
  "bayar per token AI",
  "LLM gateway Indonesia",
  "harga token AI",
  "inference API murah",
  "9inference",
];
