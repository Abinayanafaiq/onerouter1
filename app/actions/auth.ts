"use server";

import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { signIn } from "@/app/lib/auth";

export async function registerAction(formData: FormData) {
  const t = await getTranslations("Auth");
  const locale = await getLocale();
  const name = (formData.get("name") as string | null)?.trim() || null;
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;
  const confirm = formData.get("confirm") as string | null;

  if (!email || !password) {
    return { error: t("errorRequired") };
  }
  if (password.length < 6) {
    return { error: t("errorMinPassword") };
  }
  if (password !== confirm) {
    return { error: t("errorConfirm") };
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
  if (!email || !password) return { error: t("errorRequired") };
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
    return { error: t("errorInvalid") };
  }
}
