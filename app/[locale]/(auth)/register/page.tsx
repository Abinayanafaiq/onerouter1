"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  registerAction,
  requestRegisterCodeAction,
  verifyRegisterCodeAction,
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

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const tc = useTranslations("Common");
  const tt = useTranslations("Terms");

  // Step 1 (email) → step 2 (kode) → step 3 (password).
  // `proof` dan `verifiedToken` adalah token HMAC stateless dari server —
  // bukti bahwa kode sudah dikirim / email sudah terverifikasi.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [proof, setProof] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");

  const [codeState, codeAction, codePending] = useActionState(
    async (_p: unknown, fd: FormData) => {
      const res = await requestRegisterCodeAction(fd);
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
      const res = await verifyRegisterCodeAction(fd);
      if ("ok" in res) {
        setVerifiedToken(res.verifiedToken);
        setStep(3);
        return null;
      }
      return res;
    },
    null as { error?: string } | null,
  );

  const [registerState, registerFormAction, registerPending] = useActionState(
    async (_p: unknown, fd: FormData) => registerAction(fd),
    null as { error?: string } | null,
  );

  return (
    <AuthShell
      title={t("registerTitle")}
      subtitle={
        step === 1
          ? t("registerSubtitle")
          : step === 2
            ? t("codeSentNotice", { email })
            : t("verifiedNotice", { email })
      }
      footer={
        <>
          {t("hasAccount")}{" "}
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

          {/* Spam notice — banyak email verifikasi nyasar ke Spam/Junk,
              terutama dari domain baru. */}
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
        <form action={registerFormAction} className="space-y-5">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="verifiedToken" value={verifiedToken} />
          <div>
            <label htmlFor="name" className={authLabelClass}>
              {tc("nameOptional")}
            </label>
            <AuthInput icon="user" id="name" name="name" type="text" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="password" className={authLabelClass}>
              {tc("password")}
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
              {tc("confirmPassword")}
            </label>
            <PasswordInput
              id="confirm"
              name="confirm"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <AuthError message={registerState?.error} />
          <AuthSubmit pending={registerPending} pendingLabel={tc("loading")} label={t("registerButton")} />
        </form>
      )}

      <p className="text-[11px] text-center text-neutral-500 mt-6 pt-5 border-t border-white/[0.06] leading-relaxed">
        {tt.rich("agreeRegister", {
          link: (chunks) => (
            <Link href="/terms" className="text-neutral-300 font-medium hover:text-[#b8ff45] transition">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </AuthShell>
  );
}
