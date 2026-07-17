"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginActionResult } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { TurnstileWidget } from "@/app/components/turnstile-widget";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const tc = useTranslations("Common");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [question, setQuestion] = useState("");
  // Capture step-1 values so step-2's hidden inputs can re-submit them.
  // Without this, when the form transitions to step 2 the email/password
  // inputs unmount and their values are lost — the server action at step 2
  // would receive empty strings and fail authorization.
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  // Keep the Turnstile token from step 1 so step 2 can re-submit it. The
  // token is single-use but Turnstile's verification endpoint tolerates a
  // short delay between issue and verify; in practice the step-2 submit
  // happens within seconds. If Cloudflare rejects the reused token, the
  // user will see the bot-check error and can restart from step 1.
  const turnstileTokenRef = useRef<string>("");

  const [state, formAction, pending] = useActionState(
    async (_p: unknown, fd: FormData) => {
      // On step-1 submit, capture email/password into React state BEFORE
      // the form re-renders. This lets the hidden inputs at step 2 preserve
      // the values even after the visible step-1 fields unmount.
      const email = (fd.get("email") as string | null) || "";
      const password = (fd.get("password") as string | null) || "";
      if (email) setEmailValue(email.toLowerCase().trim());
      if (password) setPasswordValue(password);
      const tsToken = (fd.get("cf-turnstile-response") as string | null) || "";
      if (tsToken) turnstileTokenRef.current = tsToken;

      const result = (await loginAction(fd)) as LoginActionResult;

      if (result && "needs2FA" in result) {
        setNeeds2FA(true);
        setQuestion(result.question);
        // Don't return an error — the form should stay on step 2 without
        // showing a red message. Returning null keeps state clean.
        return null;
      }

      // If we got an error while on step 2, stay on step 2 so the admin can
      // retry the answer without re-entering email/password. The hidden
      // fields will re-submit them.
      if (result && "error" in result && needs2FA) {
        return result;
      }

      // Any other error: reset to step 1 (e.g. rate limit, wrong password
      // at step 1, bot check failed). The admin re-enters email + password.
      if (result && "error" in result) {
        setNeeds2FA(false);
        setQuestion("");
      }
      return result;
    },
    null as LoginActionResult,
  );

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("loginSubtitle")}
        </p>
      </div>
      <form action={formAction} className="space-y-4">
        {/* Step 1 fields — visible at step 1, replaced by hidden inputs at
            step 2 so the server action still receives them on retry. */}
        {!needs2FA && (
          <>
            <div>
              <label htmlFor="email" className="text-sm font-medium block mb-1.5">
                {tc("email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                onChange={(e) => setEmailValue(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium block mb-1.5">
                {tc("password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Step 2 fields — admin 2FA. Visible only after the server returns
            needs2FA. Email + password are re-submitted via hidden inputs
            populated from the captured step-1 state. */}
        {needs2FA && (
          <>
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-yellow-600">
                {t("admin2FAHeader")}
              </p>
              <p className="text-sm text-foreground">{question}</p>
            </div>
            <input type="hidden" name="email" value={emailValue} />
            <input type="hidden" name="password" value={passwordValue} />
            {/* Re-emit the Turnstile token from step 1. The widget is not
                rendered at step 2, so without this the cf-turnstile-response
                field would be missing and verifyTurnstile would return
                missing-token. Reuse is best-effort; if Cloudflare rejects
                it as already-consumed, the user restarts from step 1 (which
                is the correct security behavior anyway). */}
            <input type="hidden" name="cf-turnstile-response" value={turnstileTokenRef.current} />
            <div>
              <label htmlFor="securityAnswer" className="text-sm font-medium block mb-1.5">
                {t("admin2FAAnswerLabel")}
              </label>
              <input
                id="securityAnswer"
                name="securityAnswer"
                type="text"
                required
                autoComplete="off"
                autoFocus
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              />
            </div>
          </>
        )}

        {/* Turnstile only at step 1. Step 2 cannot be reached without
            passing Turnstile at step 1, so the bot protection gate is
            already passed. Step 2 reuses the token via hidden input. */}
        {!needs2FA && (
          <TurnstileWidget
            className="flex justify-center"
            onVerified={(token) => {
              turnstileTokenRef.current = token;
            }}
          />
        )}

        {state && "error" in state && state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? tc("loading") : needs2FA ? t("admin2FAVerifyButton") : t("loginButton")}
        </button>
      </form>
      <p className="text-sm text-center mt-6 text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-foreground font-medium hover:underline">
          {t("registerLink")}
        </Link>
      </p>
    </div>
  );
}
