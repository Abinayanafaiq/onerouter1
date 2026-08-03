"use server";

import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import {
  signIn,
  RateLimitError,
  Admin2FARequiredError,
  Admin2FAFailedError,
} from "@/app/lib/auth";
import { verifyTurnstile } from "@/app/lib/turnstile";
import {
  checkRegisterRateLimit,
  peekLoginRateLimit,
  checkEmailCodeSendLimit,
  checkEmailCodeVerifyLimit,
} from "@/app/lib/rate-limit";
import { getClientIp } from "@/app/lib/proxy-utils";
import { DEFAULT_USER_RATE_LIMIT_RPM } from "@/app/lib/constants";
import { sendMail } from "@/app/lib/mail";
import {
  issueEmailCode,
  verifyEmailCode,
  issueVerifiedEmail,
  verifyVerifiedEmail,
} from "@/app/lib/email-code";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * REGISTER STEP 1 — user memasukkan email. Server mengirim kode 6 digit ke
 * email tersebut dan mengembalikan `proof` (HMAC stateless, tanpa DB) yang
 * disimpan client sebagai hidden field untuk step 2.
 */
export type RegisterCodeResult = { error: string } | { ok: true; proof: string };

export async function requestRegisterCodeAction(
  formData: FormData,
): Promise<RegisterCodeResult> {
  const t = await getTranslations("Auth");
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;

  if (!email || !EMAIL_RE.test(email)) {
    return { error: t("errorInvalidEmail") };
  }

  // Turnstile hanya di step ini (token-nya single-use). Step 2 & 3 aman karena
  // hanya bisa dilanjutkan dengan kode yang dikirim ke inbox email tersebut.
  const ts = await verifyTurnstile(turnstileToken, await headers());
  if (!ts.success) {
    return { error: t("errorBotCheck") };
  }

  const reqHeaders = await headers();
  const clientIp = getClientIp(reqHeaders) || "unknown";
  const rl = checkEmailCodeSendLimit(email, clientIp);
  if (!rl.allowed) {
    const minutes = Math.max(1, Math.ceil(rl.retryAfter / 60));
    return { error: t("errorRateLimitCode", { minutes }) };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: t("errorEmailTaken") };
  }

  const { code, proof } = issueEmailCode(email);
  const sent = await sendMail({
    to: email,
    subject: `Kode verifikasi pendaftaran: ${code}`,
    text: [
      `Kode verifikasi kamu: ${code}`,
      "",
      `Kode berlaku 10 menit. Masukkan kode ini di halaman pendaftaran.`,
      "Jika kamu tidak merasa mendaftar, abaikan email ini.",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:24px">
        <p>Kode verifikasi pendaftaran kamu:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
        <p style="color:#666;font-size:13px">Kode berlaku 10 menit. Jika kamu tidak merasa mendaftar, abaikan email ini.</p>
      </div>`,
  });
  if (!sent.ok) {
    return { error: t("errorSendCode") };
  }

  return { ok: true, proof };
}

/**
 * REGISTER STEP 2 — user memasukkan kode dari inbox. Jika cocok, server
 * mengembalikan `verifiedToken` (HMAC stateless) yang WAJIB disertakan di
 * step 3 — tanpa token ini pembuatan akun ditolak.
 */
export type VerifyCodeResult = { error: string } | { ok: true; verifiedToken: string };

export async function verifyRegisterCodeAction(
  formData: FormData,
): Promise<VerifyCodeResult> {
  const t = await getTranslations("Auth");
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const code = (formData.get("code") as string | null)?.trim();
  const proof = (formData.get("proof") as string | null) ?? "";

  if (!email || !code) {
    return { error: t("errorCodeRequired") };
  }

  const rl = checkEmailCodeVerifyLimit(email);
  if (!rl.allowed) {
    const minutes = Math.max(1, Math.ceil(rl.retryAfter / 60));
    return { error: t("errorRateLimitCode", { minutes }) };
  }

  if (!verifyEmailCode(email, code, proof)) {
    return { error: t("errorCodeInvalid") };
  }

  return { ok: true, verifiedToken: issueVerifiedEmail(email) };
}

/**
 * REGISTER STEP 3 (final) — buat password & akun. `verifiedToken` dari step 2
 * adalah satu-satunya bukti bahwa email sudah diverifikasi; tanpa token yang
 * valid (atau sudah kedaluwarsa), pendaftaran ditolak.
 */
export async function registerAction(formData: FormData) {
  const t = await getTranslations("Auth");
  const locale = await getLocale();
  const name = (formData.get("name") as string | null)?.trim() || null;
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;
  const confirm = formData.get("confirm") as string | null;
  const verifiedToken = (formData.get("verifiedToken") as string | null) ?? "";

  if (!email || !password) {
    return { error: t("errorRequired") };
  }
  if (password.length < 6) {
    return { error: t("errorMinPassword") };
  }
  if (password !== confirm) {
    return { error: t("errorConfirm") };
  }

  // Email WAJIB sudah diverifikasi lewat kode (step 1 & 2). Token stateless,
  // jadi verifikasi ini murah dan tidak menyentuh DB.
  if (!verifyVerifiedEmail(email, verifiedToken)) {
    return { error: t("errorEmailNotVerified") };
  }

  // Brute-force / mass-account protection: cap registrations per source IP.
  // Register is safe to rate-limit only in this server action because there
  // is NO alternative route handler for registration (unlike login, which
  // NextAuth exposes at /api/auth/callback/credentials). Next.js server
  // actions are invoked via internal RPC endpoints, but the function body —
  // including this rate-limit check — always runs.
  const reqHeaders = await headers();
  const clientIp = getClientIp(reqHeaders) || "unknown";
  const rl = checkRegisterRateLimit(clientIp);
  if (!rl.allowed) {
    const minutes = Math.ceil(rl.retryAfter / 60);
    return {
      error: t("errorRateLimitRegister", { minutes, count: rl.limit }),
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: t("errorEmailTaken") };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: "USER",
      // New accounts start on the default per-user rate limit. The v1 routes
      // enforce this via checkUserRateLimit(); admin can override per-user.
      rateLimit: DEFAULT_USER_RATE_LIMIT_RPM,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: `/${locale}/dashboard`,
    });
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
  }
  redirect({ href: "/dashboard", locale });
}

/**
 * Result shape for the login server action. The login form's useActionState
 * inspects this to decide whether to render the step-1 (email+password) form
 * or the step-2 (security question) form for admin 2FA.
 */
export type LoginActionResult =
  | { error: string }
  | { needs2FA: true; question: string }
  | null;

export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const t = await getTranslations("Auth");
  const locale = await getLocale();
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;
  // The securityAnswer field is only populated at step 2 of the admin 2FA
  // flow. On step 1 (normal user login, or admin login before the question
  // is shown) it is absent / empty.
  const securityAnswer = (formData.get("securityAnswer") as string | null) || "";
  if (!email || !password) return { error: t("errorRequired") };

  // Turnstile verification: only required at step 1 (no securityAnswer yet).
  // At step 2, the Turnstile token from step 1 is single-use and already
  // consumed by Cloudflare's siteverify endpoint — re-submitting it would
  // fail with `timeout-or-duplicate`. Skipping Turnstile at step 2 is safe
  // because step 2 is ONLY reachable after step 1 already passed Turnstile
  // AND the password was verified correct. An attacker who reaches step 2
  // is (a) a human who passed captcha, (b) knows the admin password. The
  // security question itself is the gate at this point — Turnstile adds no
  // marginal protection here. The rate-limit in `authorize` still applies.
  if (!securityAnswer) {
    const ts = await verifyTurnstile(turnstileToken, await headers());
    if (!ts.success) {
      return { error: t("errorBotCheck") };
    }
  }

  // NOTE: Brute-force rate-limiting for login is enforced INSIDE the
  // `authorize` callback in app/lib/auth.ts, NOT here. That is the single
  // choke point that all credential sign-in attempts must pass through,
  // including direct POSTs to /api/auth/callback/credentials that bypass
  // this server action entirely. Rate-limiting only here would leave the
  // direct API path unprotected.
  //
  // When `authorize` exhausts the bucket, it throws `RateLimitError`. We
  // catch it below and peek the (already-incremented) counter to surface a
  // "try again in N minutes" message to the user. The peek is read-only so
  // it doesn't double-count.
  //
  // Admin 2FA also lives inside `authorize`: step 1 throws
  // `Admin2FARequiredError` (with the question attached), step 2 throws
  // `Admin2FAFailedError` on a wrong answer. We catch both here and shape
  // the response so the client form can transition between steps.
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const path = user?.role === "ADMIN" ? "/admin" : "/dashboard";
    await signIn("credentials", {
      email,
      password,
      // Pass through the securityAnswer if present. For non-admin users and
      // for admin step 1, this is an empty string — authorize ignores it.
      // Authorize only checks it when the user is ADMIN AND 2FA is enabled.
      securityAnswer,
      redirectTo: `/${locale}${path}`,
    });
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;

    // Rate-limited (too many failed attempts, either wrong passwords or
    // wrong 2FA answers — they share the same per-email bucket by design).
    // Peek the counter to surface a retry-after hint to the user.
    if (e instanceof RateLimitError) {
      const reqHeaders = await headers();
      const clientIp = getClientIp(reqHeaders) || "unknown";
      const peek = peekLoginRateLimit(clientIp, email);
      const minutes = Math.max(1, Math.ceil(peek.retryAfter / 60));
      return { error: t("errorRateLimitLogin", { minutes }) };
    }

    // Admin 2FA step 1: password was correct, user is ADMIN with 2FA
    // configured, but no securityAnswer was supplied. Surface the question
    // to the client so it can render the step-2 form. This is NOT an error
    // from the user's perspective — it's a normal flow transition.
    if (e instanceof Admin2FARequiredError) {
      return { needs2FA: true, question: e.question };
    }

    // Admin 2FA step 2: the supplied answer was wrong. Show a generic
    // "invalid" message — we deliberately do NOT say "wrong answer" vs
    // "wrong password" to avoid leaking which step the attacker is on.
    // The rate-limit slot consumed inside authorize counts toward the
    // shared 5/10-minute per-email lockout.
    if (e instanceof Admin2FAFailedError) {
      return { error: t("errorInvalid") };
    }

    return { error: t("errorInvalid") };
  }

  return null;
}
