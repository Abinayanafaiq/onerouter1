import { randomBytes, createHash, timingSafeEqual } from "crypto";

export const API_KEY_PREFIX = "sk_live_";

export type GeneratedApiKey = {
  /** Full plaintext key. Shown to the user exactly once. */
  key: string;
  /** SHA-256 hash stored in the DB (never store plaintext). */
  keyHash: string;
  /** Leading identifier segment, e.g. "sk_live_ab". Safe to store/display. */
  prefix: string;
  /** Last 4 chars of the key, used for masked display. */
  last4: string;
};

export function generateApiKey(): GeneratedApiKey {
  const random = randomBytes(24).toString("hex");
  const key = `${API_KEY_PREFIX}${random}`;
  return {
    key,
    keyHash: hashKey(key),
    prefix: prefixOf(key),
    last4: key.slice(-4),
  };
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Stable, display-safe prefix segment of a key (`sk_live_` + first 2 chars). */
export function prefixOf(key: string): string {
  const rest = key.startsWith(API_KEY_PREFIX) ? key.slice(API_KEY_PREFIX.length) : key;
  return `${API_KEY_PREFIX}${rest.slice(0, 2)}`;
}

/**
 * Mask a full key for display, e.g. `sk_live_********************************8K2D`.
 * Used only when the full key happens to be available (legacy rows).
 */
export function maskKey(key: string): string {
  if (key.length < 12) return key;
  const head = key.startsWith(API_KEY_PREFIX) ? API_KEY_PREFIX : key.slice(0, 8);
  return `${head}${"*".repeat(32)}${key.slice(-4)}`;
}

/**
 * Build a masked representation from the stored prefix + last4 only, so we can
 * display a key without ever holding the plaintext.
 */
export function maskFromParts(prefix: string | null, last4: string | null): string {
  const head = prefix || API_KEY_PREFIX;
  const tail = last4 || "****";
  return `${head}${"*".repeat(32)}${tail}`;
}

/**
 * Constant-time comparison of two hex-encoded hashes to guard against timing
 * attacks. Both inputs are SHA-256 hex strings of equal length.
 */
export function safeHashEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}
