"use server";

import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { signIn, RateLimitError } from "@/app/lib/auth";
import { verifyTurnstile } from "@/app/lib/turnstile";
import { checkRegisterRateLimit, peekLoginRateLimit } from "@/app/lib/rate-limit";
import { getClientIp } from "@/app/lib/proxy-utils";

export async function registerAction(formData: FormData) {
  const t = await getTranslations("Auth");
  const locale = await getLocale();
  const name = (formData.get("name") as string | null)?.trim() || null;
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;
  const confirm = formData.get("confirm") as string | null;
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;

  if (!email || !password) {
    return { error: t("errorRequired") };
  }
  if (password.length < 6) {
    return { error: t("errorMinPassword") };
  }
  if (password !== confirm) {
    return { error: t("errorConfirm") };
  }

  const ts = await verifyTurnstile(turnstileToken, await headers());
  if (!ts.success) {
    return { error: t("errorBotCheck") };
  }

  // Brute-force / mass-account protection: cap registrations per source IP.
  // Checked AFTER Turnstile so the bot-check is the first gate (cheaper for
  // legit users who fail captcha) but BEFORE the DB lookup so we don't leak
  // "email already taken" info to a rate-limited attacker.
  //
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
    data: { email, password: hashed, name, role: "USER" },
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

export async function loginAction(formData: FormData) {
  const t = await getTranslations("Auth");
  const locale = await getLocale();
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;
  if (!email || !password) return { error: t("errorRequired") };

  const ts = await verifyTurnstile(turnstileToken, await headers());
  if (!ts.success) {
    return { error: t("errorBotCheck") };
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
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const path = user?.role === "ADMIN" ? "/admin" : "/dashboard";
    await signIn("credentials", {
      email,
      password,
      redirectTo: `/${locale}${path}`,
    });
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;

    // Surface a specific "rate limited" message when authorize threw
    // RateLimitError. We re-derive the retry-after from the counter state
    // (read-only peek) so the user knows how long to wait. Without this,
    // they'd see the generic "invalid credentials" message even though the
    // real reason is throttling — frustrating and confusing.
    if (e instanceof RateLimitError) {
      const reqHeaders = await headers();
      const clientIp = getClientIp(reqHeaders) || "unknown";
      const peek = peekLoginRateLimit(clientIp, email);
      const minutes = Math.max(1, Math.ceil(peek.retryAfter / 60));
      return { error: t("errorRateLimitLogin", { minutes }) };
    }

    return { error: t("errorInvalid") };
  }
}
