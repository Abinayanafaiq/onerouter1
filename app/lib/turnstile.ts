import { getClientIp } from "./proxy-utils";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_ENABLED =
  !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
  !!process.env.TURNSTILE_SECRET_KEY;

export type TurnstileVerifyResult = {
  success: boolean;
  /** Skip = Turnstile tidak dikonfigurasi (mode dev). Bypass verifikasi. */
  skipped: boolean;
  error?: string;
};

/**
 * Verifikasi token Turnstile ke Cloudflare. Wajib dipanggil di server action /
 * route handler, JANGAN di client.
 *
 * - Jika env vars tidak diset, di-skip (skipped: true, success: true) supaya
 *   dev tetap jalan tanpa Turnstile.
 * - Jika token kosong saat Turnstile aktif → gagal.
 * - `headers` dipakai untuk mengirim remoteip (cf-connecting-ip / x-forwarded-for).
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  headers: Headers,
): Promise<TurnstileVerifyResult> {
  if (!TURNSTILE_ENABLED) {
    return { success: true, skipped: true };
  }
  if (!token || typeof token !== "string") {
    return { success: false, skipped: false, error: "missing-token" };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY as string;
  const remoteip = getClientIp(headers) || undefined;

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteip) form.set("remoteip", remoteip);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body: form,
      // siteverify cepat (~50-100ms), tidak perlu cache.
      cache: "no-store",
    });
    if (!res.ok) {
      return { success: false, skipped: false, error: `http-${res.status}` };
    }
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      return {
        success: false,
        skipped: false,
        error: data["error-codes"]?.[0] || "verify-failed",
      };
    }
    return { success: true, skipped: false };
  } catch (e) {
    return {
      success: false,
      skipped: false,
      error: e instanceof Error ? e.message : "fetch-error",
    };
  }
}
