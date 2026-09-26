export const MASTER_API_URL = process.env.MASTER_API_URL || "https://limitrouter.com/v1";
export const MASTER_API_KEY = process.env.MASTER_API_KEY || "";

/**
 * Secondary (backup) upstream. Certain model IDs are routed here instead of
 * the master upstream. The upstream uses different model IDs than the ones
 * we expose publicly — BACKUP_UPSTREAM_MODEL_MAP does the translation.
 *
 * BACKUP_API_KEY must be set via environment variable (never committed).
 * When it is missing, models in the map gracefully fall back to the master
 * upstream using their regular masterId.
 */
export const BACKUP_API_URL = process.env.BACKUP_API_URL || "https://backup.limitrouter.com/v1";
export const BACKUP_API_KEY = process.env.BACKUP_API_KEY || "";

/** Public (client-facing) modelId → model ID expected by the backup upstream. */
export const BACKUP_UPSTREAM_MODEL_MAP: Record<string, string> = {
  "deepseek-v4-flash-0731": "wdb-DeepSeek-V4-Flash-0731",
  "deepseek-v4-pro-0813": "wdb-DeepSeek-V4-Pro-0813",
  "deepseek-v4.1-flash": "wdb-DeepSeek-V4.1-Flash",
};

/**
 * Resolve the upstream model ID on the backup endpoint for a public modelId.
 * Returns null when the model is not backup-routed OR when BACKUP_API_KEY is
 * not configured (caller then uses the master upstream as usual).
 */
export function getBackupUpstreamModelId(modelId: string): string | null {
  if (!BACKUP_API_KEY) return null;
  return BACKUP_UPSTREAM_MODEL_MAP[modelId] ?? null;
}

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@onerouter.id";

export const APP_NAME = "9inference";
export const APP_TAGLINE = "Token AI Murah - Multi Model Premium";

/**
 * Default per-user rate limit (requests per minute) applied to every newly
 * registered account. Set on User.rateLimit at registration; enforced by
 * checkUserRateLimit() in the v1 chat completions routes. Admin can override
 * or clear it (null/0 = unlimited) via the admin users API.
 */
export const DEFAULT_USER_RATE_LIMIT_RPM = 20;

/**
 * Credit unit: TOKS.
 * 1 TOKS = Rp1.000. Wallet balances & AI usage costs are stored internally in
 * IDR (rupiah); TOKS is the user-facing credit unit used for top up & display.
 */
export const TOKS_LABEL = "TOKS";
export const IDR_PER_TOKS = 1000;

/** Fixed display rate: 1 TOKS ≈ US$0.0553 (reference only, billing stays in IDR). */
export const USD_PER_TOKS = 0.0553;

/** Convert an IDR amount into TOKS credit. */
export function idrToToks(idr: number): number {
  return idr / IDR_PER_TOKS;
}

/** Convert an IDR amount into its USD reference value (display only). */
export function idrToUsd(idr: number): number {
  return idrToToks(idr) * USD_PER_TOKS;
}

/** Convert a TOKS credit amount into IDR (rupiah). */
export function toksToIdr(toks: number): number {
  return toks * IDR_PER_TOKS;
}

/**
 * Format a TOKS value for display. Uses up to `maxFractionDigits` decimals so
 * small AI-usage amounts (fractions of a TOKS) still render meaningfully.
 */
export function formatToks(
  toks: number,
  maxFractionDigits = 4,
): string {
  const formatted = toks.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
  return `${formatted} ${TOKS_LABEL}`;
}

/** Format an IDR amount from a TOKS-denominated value (for reference display). */
export function formatToksAsIdr(toks: number): string {
  return "Rp" + toksToIdr(toks).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export {
  PROVIDER_MODEL_MAP,
  ALL_PROVIDERS,
  ALL_KNOWN_MODEL_IDS,
  getProviderForModel,
  getModelsByProvider,
  isKnownModel,
  MODEL_SEED_DATA,
  type ProviderName,
} from "./providers";

import { ALL_KNOWN_MODEL_IDS, getProviderForModel, isKnownModel } from "./providers";

/**
 * @deprecated Use the centralized provider mapping in `app/lib/providers.ts`
 * or query the database via `app/lib/models.ts` instead. Kept for backward
 * compatibility with any code that still imports these helpers.
 */
export function mapModelToMaster(model: string): string | null {
  if (isKnownModel(model)) return model;
  return null;
}

export function isValidModel(model: string): boolean {
  return ALL_KNOWN_MODEL_IDS.includes(model);
}

export { getProviderForModel as providerForModel };
