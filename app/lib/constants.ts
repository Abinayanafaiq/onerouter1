export const MASTER_API_URL = process.env.MASTER_API_URL || "https://limitrouter.com/v1";
export const MASTER_API_KEY = process.env.MASTER_API_KEY || "";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@onerouter.id";

export const APP_NAME = "OneRouter";
export const APP_TAGLINE = "Token AI Murah - Multi Model Premium";

/**
 * Credit unit: TOKS.
 * 1 TOKS = Rp1.000. Wallet balances & AI usage costs are stored internally in
 * IDR (rupiah); TOKS is the user-facing credit unit used for top up & display.
 */
export const TOKS_LABEL = "TOKS";
export const IDR_PER_TOKS = 1000;

/** Convert an IDR amount into TOKS credit. */
export function idrToToks(idr: number): number {
  return idr / IDR_PER_TOKS;
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
