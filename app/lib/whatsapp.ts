/**
 * Validate and normalize a WhatsApp phone number.
 * Rules: strip whitespace, require digits, leading "+" allowed, length 8-15.
 * Returns the normalized value, or null if invalid.
 */
export function normalizeWhatsApp(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const re = /^\+?\d{8,15}$/;
  if (!re.test(trimmed)) return null;
  return trimmed;
}

export function isValidWhatsApp(input: string): boolean {
  return normalizeWhatsApp(input) !== null;
}
