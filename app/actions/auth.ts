"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { signIn } from "@/app/lib/auth";

export async function registerAction(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim() || null;
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;
  const confirm = formData.get("confirm") as string | null;

  if (!email || !password) {
    return { error: "Email dan password wajib diisi" };
  }
  if (password.length < 6) {
    return { error: "Password minimal 6 karakter" };
  }
  if (password !== confirm) {
    return { error: "Konfirmasi password tidak cocok" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Email sudah terdaftar, silakan login" };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, password: hashed, name, role: "USER" },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
  }
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;
  if (!email || !password) return { error: "Email dan password wajib diisi" };
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const redirectTo = user?.role === "ADMIN" ? "/admin" : "/dashboard";
    await signIn("credentials", { email, password, redirectTo });
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    return { error: "Email atau password salah" };
  }
}
