"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { registerAction } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { TurnstileWidget } from "@/app/components/turnstile-widget";

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(
    async (_p: unknown, fd: FormData) => registerAction(fd),
    null as { error?: string } | null,
  );

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("registerSubtitle")}
        </p>
      </div>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium block mb-1.5">
            {tc("nameOptional")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          />
        </div>
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
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
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
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          />
        </div>
        <TurnstileWidget className="flex justify-center" />
        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? tc("loading") : t("registerButton")}
        </button>
      </form>
      <p className="text-sm text-center mt-6 text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-foreground font-medium hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}
