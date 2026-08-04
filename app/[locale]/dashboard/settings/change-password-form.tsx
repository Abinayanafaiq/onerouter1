"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  changePasswordAction,
  type ChangePasswordResult,
} from "@/app/actions/auth";
import { authInputClass, authLabelClass } from "@/app/components/auth-shell";

/**
 * Form ganti password di dashboard/settings. Verifikasi password lama di
 * server (changePasswordAction). Setelah sukses, input dikosongkan supaya
 * password tidak tertinggal di DOM state.
 */
export function ChangePasswordForm() {
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_p: ChangePasswordResult | null, fd: FormData) => {
      const result = await changePasswordAction(fd);
      if ("ok" in result) {
        formRef.current?.reset();
      }
      return result;
    },
    null as ChangePasswordResult | null,
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className={authLabelClass}>
          {t("currentPassword")}
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={authInputClass}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="newPassword" className={authLabelClass}>
            {t("newPassword")}
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="confirmNewPassword" className={authLabelClass}>
            {t("confirmNewPassword")}
          </label>
          <input
            id="confirmNewPassword"
            name="confirmNewPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={authInputClass}
          />
        </div>
      </div>

      {state && "error" in state && state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="text-sm text-[#b8ff45]">{t("success")}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-accent h-11 rounded-lg px-6 text-sm font-semibold disabled:opacity-50 disabled:pointer-events-none"
      >
        {pending ? tc("loading") : t("changeButton")}
      </button>
    </form>
  );
}
