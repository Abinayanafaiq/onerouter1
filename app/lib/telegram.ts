import { prisma } from "@/app/lib/prisma";

const SETTING_KEY = "telegram_group_url";

/**
 * Strictly validate a Telegram group invite URL.
 * Allows https://t.me/... or https://telegram.me/... (including private
 * invite links like https://t.me/+<invite>). Rejects all other schemes.
 */
export function isValidTelegramUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host !== "t.me" && host !== "telegram.me") return false;
    return true;
  } catch {
    return false;
  }
}

export async function getTelegramGroupUrl(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  return row?.value || "";
}

export async function setTelegramGroupUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: trimmed },
    create: { key: SETTING_KEY, value: trimmed },
  });
}

export async function clearTelegramGroupUrl(): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: "" },
    create: { key: SETTING_KEY, value: "" },
  });
}
