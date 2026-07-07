import { randomBytes, createHash } from "crypto";

export function generateApiKey(): { key: string; keyHash: string } {
  const random = randomBytes(24).toString("hex");
  const key = `sk_live_${random}`;
  const keyHash = hashKey(key);
  return { key, keyHash };
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function maskKey(key: string): string {
  if (key.length < 12) return key;
  return `${key.slice(0, 10)}${"*".repeat(20)}${key.slice(-4)}`;
}
