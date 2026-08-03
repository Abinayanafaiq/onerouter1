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
  authInputClass,
  authLabelClass,
  authButtonClass,
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
        <form action={codeAction} className="space-y-4">
          <div>
            <label htmlFor="email" className={authLabelClass}>
              {tc("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              className={authInputClass}
            />
          </div>
          <TurnstileWidget className="flex justify-center" />
          {codeState?.error && (
            <p className="text-sm text-red-400">{codeState.error}</p>
          )}
          <button type="submit" disabled={codePending} className={authButtonClass}>
            {codePending ? tc("loading") : t("sendCodeButton")}
          </button>
        </form>
      )}

      {step === 2 && (
        <form action={verifyAction} className="space-y-4">
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
              className={`${authInputClass} text-center text-2xl tracking-[0.5em] font-mono py-3.5`}
            />
          </div>

          {/* Spam notice — banyak email verifikasi nyasar ke Spam/Junk,
              terutama dari domain baru. */}
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-3 flex items-start gap-2.5">
            <svg
              className="h-4 w-4 mt-0.5 shrink-0 text-amber-400/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <p className="text-xs leading-relaxed text-amber-200/80">
              {t.rich("spamNotice", {
                b: (chunks) => <strong className="text-amber-200">{chunks}</strong>,
              })}
            </p>
          </div>

          {verifyState?.error && (
            <p className="text-sm text-red-400">{verifyState.error}</p>
          )}
          <button type="submit" disabled={verifyPending} className={authButtonClass}>
            {verifyPending ? tc("loading") : t("verifyCodeButton")}
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full py-1 text-sm text-muted-foreground hover:text-foreground transition"
          >
            {t("changeEmail")}
          </button>
        </form>
      )}

      {step === 3 && (
        <form action={registerFormAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="verifiedToken" value={verifiedToken} />
          <div>
            <label htmlFor="name" className={authLabelClass}>
              {tc("nameOptional")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className={authInputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className={authLabelClass}>
              {tc("password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={authInputClass}
            />
          </div>
          <div>
            <label htmlFor="confirm" className={authLabelClass}>
              {tc("confirmPassword")}
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={authInputClass}
            />
          </div>
          {registerState?.error && (
            <p className="text-sm text-red-400">{registerState.error}</p>
          )}
          <button type="submit" disabled={registerPending} className={authButtonClass}>
            {registerPending ? tc("loading") : t("registerButton")}
          </button>
        </form>
      )}

      <p className="text-[11px] text-center text-neutral-500 mt-5 leading-relaxed">
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
