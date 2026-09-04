"use server";

import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import {
  auth,
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
  checkRateLimit,
} from "@/app/lib/rate-limit";
import { getClientIp } from "@/app/lib/proxy-utils";
import { DEFAULT_USER_RATE_LIMIT_RPM } from "@/app/lib/constants";
import { sendMail } from "@/app/lib/mail";
import { isEmailDomainBlocked } from "@/app/lib/email-blacklist";
import {
  issueEmailCode,
  verifyEmailCode,
  issueVerifiedEmail,
  verifyVerifiedEmail,
  issuePasswordResetCode,
  verifyPasswordResetCode,
  issuePasswordResetToken,
  verifyPasswordResetToken,
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

  // Blacklist domain email: tolak sedini mungkin — sebelum Turnstile & sebelum
  // kode verifikasi dikirim (hemat captcha + biaya email untuk domain abuser).
  if (await isEmailDomainBlocked(email)) {
    return { error: t("errorEmailDomainBlocked") };
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

  // Defense-in-depth: token verifikasi bisa saja diterbitkan SEBELUM domain
  // ini di-blacklist — cek ulang di langkah final sebelum akun dibuat.
  if (await isEmailDomainBlocked(email)) {
    return { error: t("errorEmailDomainBlocked") };
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

/**
 * CHANGE PASSWORD — dipanggil dari halaman dashboard/settings. Wajib login.
 * Password lama diverifikasi dulu (gate utama), lalu hash baru disimpan.
 * Di-rate-limit per user (5 percobaan/menit) supaya password lama tidak bisa
 * di-brute-force lewat form ini. Sesi JWT yang sedang berjalan tetap valid
 * setelah ganti password (perilaku standar; password baru dipakai saat
 * login berikutnya).
 */
export type ChangePasswordResult = { error: string } | { ok: true };

export async function changePasswordAction(
  formData: FormData,
): Promise<ChangePasswordResult> {
  const t = await getTranslations("Settings");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: t("errorUnauthorized") };
  }

  const current = formData.get("currentPassword") as string | null;
  const next = formData.get("newPassword") as string | null;
  const confirm = formData.get("confirmNewPassword") as string | null;
  if (!current || !next || !confirm) {
    return { error: t("errorRequired") };
  }
  if (next.length < 6) {
    return { error: t("errorMinPassword") };
  }
  if (next !== confirm) {
    return { error: t("errorConfirm") };
  }

  const rl = checkRateLimit(`pwchange:${userId}`, 5);
  if (!rl.allowed) {
    return { error: t("errorRateLimit", { seconds: rl.retryAfter }) };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: t("errorUnauthorized") };
  }

  const valid = await bcrypt.compare(current, user.password);
  if (!valid) {
    return { error: t("errorWrongCurrent") };
  }

  const hashed = await bcrypt.hash(next, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return { ok: true };
}

/**
 * FORGOT PASSWORD — 3 langkah, mirror flow registrasi:
 *   1. requestPasswordResetCodeAction — kirim kode 6 digit ke email.
 *   2. verifyPasswordResetCodeAction — kode cocok → resetToken (HMAC).
 *   3. resetPasswordAction — set password baru dengan resetToken.
 *
 * Token reset pakai namespace HMAC terpisah dari registrasi (lihat
 * email-code.ts) sehingga token antar-flow tidak bisa dipakai silang.
 */

/**
 * RESET STEP 1 — kirim kode reset ke email.
 *
 * ANTI-ENUMERATION: respons SELALU sukses (ok + proof) baik email terdaftar
 * maupun tidak. Untuk email yang tidak terdaftar, kode tetap diterbitkan
 * tetapi email tidak dikirim — attacker tidak bisa membedakan kedua kasus
 * dari respons server. Ini mencegah flow reset dipakai untuk menebak email
 * mana yang punya akun. (Pendaftaran memang sudah menampilkan errorEmailTaken,
 * tapi flow reset tidak perlu menambah vektor enumerasi baru.)
 */
export async function requestPasswordResetCodeAction(
  formData: FormData,
): Promise<RegisterCodeResult> {
  const t = await getTranslations("Auth");
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;

  if (!email || !EMAIL_RE.test(email)) {
    return { error: t("errorInvalidEmail") };
  }

  // Turnstile hanya di step ini (token single-use). Step 2 & 3 hanya bisa
  // dilanjutkan dengan kode yang dikirim ke inbox email tersebut.
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

  const { code, proof } = issuePasswordResetCode(email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const sent = await sendMail({
      to: email,
      subject: `Kode reset password: ${code}`,
      text: [
        `Kode reset password kamu: ${code}`,
        "",
        `Kode berlaku 10 menit. Masukkan kode ini di halaman reset password.`,
        "Jika kamu tidak meminta reset password, abaikan email ini — password kamu tidak berubah.",
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:24px">
          <p>Kode reset password kamu:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
          <p style="color:#666;font-size:13px">Kode berlaku 10 menit. Jika kamu tidak meminta reset password, abaikan email ini — password kamu tidak berubah.</p>
        </div>`,
    });
    if (!sent.ok) {
      return { error: t("errorSendCode") };
    }
  }

  return { ok: true, proof };
}

/**
 * RESET STEP 2 — verifikasi kode dari inbox. Jika cocok, kembalikan
 * `resetToken` yang WAJIB disertakan di step 3 — tanpa token yang valid,
 * penggantian password ditolak.
 */
export type VerifyResetCodeResult = { error: string } | { ok: true; resetToken: string };

export async function verifyPasswordResetCodeAction(
  formData: FormData,
): Promise<VerifyResetCodeResult> {
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

  if (!verifyPasswordResetCode(email, code, proof)) {
    return { error: t("errorCodeInvalid") };
  }

  return { ok: true, resetToken: issuePasswordResetToken(email) };
}

/**
 * RESET STEP 3 (final) — set password baru. `resetToken` dari step 2 adalah
 * satu-satunya bukti bahwa user menguasai inbox email tersebut.
 *
 * Setelah sukses, user langsung di-sign-in (pola yang sama dengan
 * registerAction). Untuk ADMIN dengan 2FA aktif, auto sign-in gagal dan
 * user diarahkan ke halaman login untuk masuk manual.
 */
export async function resetPasswordAction(formData: FormData) {
  const t = await getTranslations("Auth");
  const locale = await getLocale();
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;
  const confirm = formData.get("confirm") as string | null;
  const resetToken = (formData.get("resetToken") as string | null) ?? "";

  if (!email || !password) {
    return { error: t("errorRequired") };
  }
  if (password.length < 6) {
    return { error: t("errorMinPassword") };
  }
  if (password !== confirm) {
    return { error: t("errorConfirm") };
  }

  if (!verifyPasswordResetToken(email, resetToken)) {
    return { error: t("errorResetSession") };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Seharusnya tidak terjadi (step 1 netral, step 2 butuh kode dari inbox),
    // tapi jaga-jaga jika akun dihapus di tengah flow.
    return { error: t("errorResetSession") };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  const path = user.role === "ADMIN" ? "/admin" : "/dashboard";
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: `/${locale}${path}`,
    });
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    // Auto sign-in gagal (mis. admin 2FA wajib jawaban keamanan, atau rate
    // limit login) → arahkan user login manual dengan password barunya.
    redirect({ href: "/login", locale });
  }
  redirect({ href: path, locale });
}
