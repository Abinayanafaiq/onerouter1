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

const inputClass =
  "w-full px-3 py-2 border rounded-md bg-background text-sm";

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
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 1 && t("registerSubtitle")}
          {step === 2 && t("codeSentNotice", { email })}
          {step === 3 && t("verifiedNotice", { email })}
        </p>
      </div>

      {step === 1 && (
        <form action={codeAction} className="space-y-4">
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
              className={inputClass}
            />
          </div>
          <TurnstileWidget className="flex justify-center" />
          {codeState?.error && (
            <p className="text-sm text-red-600">{codeState.error}</p>
          )}
          <button
            type="submit"
            disabled={codePending}
            className="w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {codePending ? tc("loading") : t("sendCodeButton")}
          </button>
        </form>
      )}

      {step === 2 && (
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="proof" value={proof} />
          <div>
            <label htmlFor="code" className="text-sm font-medium block mb-1.5">
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
              className={`${inputClass} text-center text-lg tracking-[0.5em] font-mono`}
            />
          </div>
          {verifyState?.error && (
            <p className="text-sm text-red-600">{verifyState.error}</p>
          )}
          <button
            type="submit"
            disabled={verifyPending}
            className="w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {verifyPending ? tc("loading") : t("verifyCodeButton")}
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
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
            <label htmlFor="name" className="text-sm font-medium block mb-1.5">
              {tc("nameOptional")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className={inputClass}
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
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="text-sm font-medium block mb-1.5">
              {tc("confirmPassword")}
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          {registerState?.error && (
            <p className="text-sm text-red-600">{registerState.error}</p>
          )}
          <button
            type="submit"
            disabled={registerPending}
            className="w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {registerPending ? tc("loading") : t("registerButton")}
          </button>
        </form>
      )}

      <p className="text-xs text-center text-muted-foreground mt-4">
        {tt.rich("agreeRegister", {
          link: (chunks) => (
            <Link href="/terms" className="text-foreground font-medium hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <p className="text-sm text-center mt-6 text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-foreground font-medium hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}
