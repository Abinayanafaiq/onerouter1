"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  requestPasswordResetCodeAction,
  verifyPasswordResetCodeAction,
  resetPasswordAction,
} from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { TurnstileWidget } from "@/app/components/turnstile-widget";
import {
  AuthShell,
  StepIndicator,
  AuthInput,
  PasswordInput,
  AuthError,
  AuthSubmit,
  AuthNotice,
  authInputClass,
  authLabelClass,
} from "@/app/components/auth-shell";

/**
 * Halaman lupa password — 3 langkah, mirror flow registrasi:
 * email → kode dari inbox → password baru. `proof` dan `resetToken` adalah
 * token HMAC stateless dari server (namespace khusus reset, tidak bisa
 * dipakai silang dengan flow registrasi).
 */
export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const tc = useTranslations("Common");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [proof, setProof] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [codeState, codeAction, codePending] = useActionState(
    async (_p: unknown, fd: FormData) => {
      const res = await requestPasswordResetCodeAction(fd);
      if ("ok" in res) {
        setEmail((fd.get("email") as string).toLowerCase().trim());
        setProof(res.proof);
        setStep(2);
        return null;
      }
      return res;
    },
    null as { error?: string } | null,
  );

  const [verifyState, verifyAction, verifyPending] = useActionState(
    async (_p: unknown, fd: FormData) => {
      const res = await verifyPasswordResetCodeAction(fd);
      if ("ok" in res) {
        setResetToken(res.resetToken);
        setStep(3);
        return null;
      }
      return res;
    },
    null as { error?: string } | null,
  );

  const [resetState, resetFormAction, resetPending] = useActionState(
    async (_p: unknown, fd: FormData) => resetPasswordAction(fd),
    null as { error?: string } | null,
  );

  return (
    <AuthShell
      title={t("resetTitle")}
      subtitle={
        step === 1
          ? t("resetSubtitle")
          : step === 2
            ? t("resetSentNotice", { email })
            : t("resetVerifiedNotice", { email })
      }
      footer={
        <>
          {t("rememberPassword")}{" "}
          <Link href="/login" className="text-foreground font-medium hover:text-[#b8ff45] transition">
            {t("loginLink")}
          </Link>
        </>
      }
    >
      <StepIndicator
        steps={[t("stepEmail"), t("stepCode"), t("stepPassword")]}
        current={step}
      />

      {step === 1 && (
        <form action={codeAction} className="space-y-5">
          <div>
            <label htmlFor="email" className={authLabelClass}>
              {tc("email")}
            </label>
            <AuthInput
              icon="mail"
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
            />
          </div>
          <TurnstileWidget className="flex justify-center" />
          <AuthError message={codeState?.error} />
          <AuthSubmit pending={codePending} pendingLabel={tc("loading")} label={t("sendCodeButton")} />
        </form>
      )}

      {step === 2 && (
        <form action={verifyAction} className="space-y-5">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="proof" value={proof} />
          <div>
            <label htmlFor="code" className={authLabelClass}>
              {t("codeLabel")}
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder={t("codePlaceholder")}
              className={`${authInputClass} h-14 text-center text-2xl tracking-[0.5em] font-mono`}
            />
          </div>

          <AuthNotice>
            {t.rich("spamNotice", {
              b: (chunks) => <strong className="text-amber-200">{chunks}</strong>,
            })}
          </AuthNotice>

          <AuthError message={verifyState?.error} />
          <AuthSubmit pending={verifyPending} pendingLabel={tc("loading")} label={t("verifyCodeButton")} />
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full py-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            {t("changeEmail")}
          </button>
        </form>
      )}

      {step === 3 && (
        <form action={resetFormAction} className="space-y-5">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="resetToken" value={resetToken} />
          <div>
            <label htmlFor="password" className={authLabelClass}>
              {t("newPasswordLabel")}
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirm" className={authLabelClass}>
              {t("confirmNewPasswordLabel")}
            </label>
            <PasswordInput
              id="confirm"
              name="confirm"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <AuthError message={resetState?.error} />
          <AuthSubmit pending={resetPending} pendingLabel={tc("loading")} label={t("resetButton")} />
        </form>
      )}
    </AuthShell>
  );
}
