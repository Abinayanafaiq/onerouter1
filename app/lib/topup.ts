export const MIN_TOPUP = 1000;
export const MAX_TOPUP = 100_000_000;

/**
 * Validate a wallet top-up amount (IDR) from a JSON request body.
 * Only a real JSON number that is a whole rupiah within [MIN_TOPUP, MAX_TOPUP]
 * is accepted — strings ("10000"), arrays ([10000]), booleans and fractions
 * (10000.5) are rejected instead of being coerced. QRIS nominals must be
 * whole rupiah, so a fraction must never reach the payment gateway.
 */
export function parseTopupAmount(
  raw: unknown,
): { ok: true; amount: number } | { ok: false; error: string } {
  if (typeof raw !== "number" || !Number.isSafeInteger(raw)) {
    return { ok: false, error: "Nominal top up harus berupa angka bulat (rupiah)." };
  }
  if (raw < MIN_TOPUP) {
    return { ok: false, error: `Minimal top up Rp${MIN_TOPUP.toLocaleString("id-ID")}` };
  }
  if (raw > MAX_TOPUP) {
    return { ok: false, error: `Maksimal top up Rp${MAX_TOPUP.toLocaleString("id-ID")}` };
  }
  return { ok: true, amount: raw };
}
