/**
 * Validate and normalize a WhatsApp phone number.
 * Rules: common separators (spaces, dashes, dots, parentheses) are stripped,
 * then only an optional leading "+" followed by 8-15 digits is allowed.
 * Anything else (letters, markup, etc.) is rejected, so the stored value is
 * always a plain phone number and safe to render anywhere.
 * Returns the normalized value, or null if invalid.
 */
export function normalizeWhatsApp(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const compact = input.trim().replace(/[\s\-.()]/g, "");
  if (!compact) return null;
  const re = /^\+?\d{8,15}$/;
  if (!re.test(compact)) return null;
  return compact;
}

export function isValidWhatsApp(input: string): boolean {
  return normalizeWhatsApp(input) !== null;
}

export const INVALID_WHATSAPP_ERROR =
  "Nomor WhatsApp tidak valid. Gunakan angka saja (8-15 digit), boleh diawali +.";
