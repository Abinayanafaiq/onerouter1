import { createHash, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

/**
 * Admin 2FA via security question.
 *
 * Storage: two rows in the Setting table — one for the question (plaintext,
 * non-sensitive — it's shown to the admin at login) and one for the answer
 * (SHA-256 hash of the normalized answer; the plaintext is never stored).
 *
 * Activation: 2FA is OPTIONAL until the admin sets a question+answer via
 * /admin/settings. Once both are set, the next admin login requires the
 * correct answer. Until then, admin login proceeds without 2FA.
 *
 * Normalization: the answer is lowercased, trimmed, and inner whitespace
 * collapsed to a single space before hashing. This makes "Jane  Doe" match
 * "jane doe" without weakening the hash by storing the raw input.
 */

const SETTING_KEYS = {
  question: "admin_2fa_question",
  answerHash: "admin_2fa_answer_hash",
} as const;

export type Admin2FASettings = {
  /** The security question shown at login. Empty when 2FA is not configured. */
  question: string;
  /** SHA-256 hex hash of the normalized answer. Empty when 2FA is not configured. */
  answerHash: string;
  /** Convenience: true when both question and answerHash are set. */
  enabled: boolean;
};

export async function getAdmin2FASettings(): Promise<Admin2FASettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [SETTING_KEYS.question, SETTING_KEYS.answerHash] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const question = map.get(SETTING_KEYS.question) || "";
  const answerHash = map.get(SETTING_KEYS.answerHash) || "";
  return { question, answerHash, enabled: !!question && !!answerHash };
}

/** Normalize an answer before hashing/comparison. */
function normalizeAnswer(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Hash a normalized answer with SHA-256. Returns hex. */
function hashAnswer(answer: string): string {
  return createHash("sha256").update(normalizeAnswer(answer), "utf8").digest("hex");
}

/**
 * Constant-time comparison of two hex-encoded SHA-256 hashes. Guards against
 * timing attacks where an attacker could probe correct answers character by
 * character via response timing.
 */
function safeHashEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify a provided answer against the stored hash. Constant-time on the hash
 * comparison. The normalization step is NOT constant-time, but it operates on
 * user input only (not on secrets), so timing there leaks nothing useful.
 *
 * Returns true iff 2FA is configured AND the answer matches.
 */
export async function verifyAdmin2FAAnswer(provided: string): Promise<boolean> {
  const { answerHash, enabled } = await getAdmin2FASettings();
  if (!enabled || !answerHash) return false;
  const providedHash = hashAnswer(provided);
  return safeHashEqualHex(providedHash, answerHash);
}

/**
 * Set (or replace) the admin security question + answer. The answer is hashed
 * before storage — the plaintext is never persisted. Both fields are written
 * in a single round of parallel upserts; if either fails, the caller sees an
 * exception and the previous state is unchanged (each upsert is independent,
 * so a mid-flight failure could leave one row updated — but since we always
 * read BOTH keys to consider 2FA enabled, a half-update is harmless: enabled
 * stays false until both are present).
 */
export async function setAdmin2FASettings(params: {
  question: string;
  answer: string;
}): Promise<void> {
  const question = params.question.trim();
  const answer = params.answer.trim();
  if (!question) throw new Error("Pertanyaan tidak boleh kosong");
  if (!answer) throw new Error("Jawaban tidak boleh kosong");
  if (question.length > 200) throw new Error("Pertanyaan terlalu panjang (maks 200 karakter)");
  if (answer.length > 200) throw new Error("Jawaban terlalu panjang (maks 200 karakter)");

  const answerHash = hashAnswer(answer);

  await Promise.all([
    prisma.setting.upsert({
      where: { key: SETTING_KEYS.question },
      update: { value: question },
      create: { key: SETTING_KEYS.question, value: question },
    }),
    prisma.setting.upsert({
      where: { key: SETTING_KEYS.answerHash },
      update: { value: answerHash },
      create: { key: SETTING_KEYS.answerHash, value: answerHash },
    }),
  ]);
}

/**
 * Disable 2FA by clearing both keys. Used if the admin forgets the answer
 * and needs to reconfigure from scratch (after re-authenticating via the
 * normal password flow — this function does NOT bypass login).
 */
export async function clearAdmin2FASettings(): Promise<void> {
  await prisma.setting.deleteMany({
    where: { key: { in: [SETTING_KEYS.question, SETTING_KEYS.answerHash] } },
  });
}
