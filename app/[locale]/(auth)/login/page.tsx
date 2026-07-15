"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(
    async (_p: unknown, fd: FormData) => loginAction(fd),
    null as { error?: string } | null,
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
            autoComplete="current-password"
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? tc("loading") : t("loginButton")}
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
