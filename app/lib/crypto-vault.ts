// REQUIRED ENV VAR:
//   MASTER_KEY_ENCRYPTION_KEY — base64-encoded 32-byte (256-bit) key for
//   AES-256-GCM encryption of master API keys at rest. Generate with:
//     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//   NEVER commit this value. NEVER log it. NEVER fall back to a hardcoded key.
//
// Encryption format: base64(iv).base64(ciphertext).base64(tag)
// Delimiter: "." (stable, not expected in base64 output).

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const DELIMITER = ".";

let cachedKey: Buffer | null = null;
let keyError: Error | null = null;

/**
 * Load and cache the encryption key from the environment. Throws a clear error
 * if the key is missing or not 32 bytes. The key is never logged.
 */
function getEncryptionKey(): Buffer {
  if (keyError) throw keyError;
  if (cachedKey) return cachedKey;

  const raw = process.env.MASTER_KEY_ENCRYPTION_KEY;
  if (!raw) {
    keyError = new Error(
      "MASTER_KEY_ENCRYPTION_KEY env var is required for master key encryption. " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
    throw keyError;
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    keyError = new Error("MASTER_KEY_ENCRYPTION_KEY must be valid base64");
    throw keyError;
  }

  if (key.length !== 32) {
    keyError = new Error(
      `MASTER_KEY_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). ` +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
    throw keyError;
  }

  cachedKey = key;
  return key;
}

/**
 * Encrypt a plaintext secret using AES-256-GCM.
 * Returns: base64(iv).base64(ciphertext).base64(tag)
 * The plaintext is never stored or logged.
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), ciphertext.toString("base64"), tag.toString("base64")].join(DELIMITER);
}

/**
 * Decrypt a payload produced by encryptSecret. Throws on tampering (GCM auth
 * tag mismatch). The plaintext is returned to the caller and should be used
 * and discarded ASAP — never cached at module level.
 */
export function decryptSecret(payload: string): string {
  const key = getEncryptionKey();
  const parts = payload.split(DELIMITER);
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }
  const [ivB64, ciphertextB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return plaintext;
}

/**
 * Constant-time comparison of two secret strings. Used where any key
 * comparison happens to mitigate timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
