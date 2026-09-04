import { prisma } from "@/app/lib/prisma";

/**
 * Blacklist domain email untuk pendaftaran akun baru.
 *
 * Disimpan di tabel Setting (key-value) supaya TIDAK perlu migrasi schema —
 * aman untuk production DB. Satu domain per baris (atau dipisah koma).
 *
 * Pencocokan: exact match ATAU subdomain dari domain yang diblacklist.
 * Mis. blacklist "evil.com" juga menolak "mail.evil.com".
 *
 * Hanya memblokir PENDAFTARAN baru — akun existing dengan domain tersebut
 * tetap bisa login (blokir akun existing dilakukan manual via admin users).
 */
const SETTING_KEY = "blocked_email_domains";

export async function getBlockedEmailDomains(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return [];
  return row.value
    .split(/[\n,;]+/)
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export async function saveBlockedEmailDomains(domains: string[]): Promise<void> {
  const normalized = Array.from(
    new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean)),
  ).sort();
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: normalized.join("\n") },
    create: { key: SETTING_KEY, value: normalized.join("\n") },
  });
}

/** Normalisasi input admin: buang "@", spasi, lowercase. */
export function normalizeDomainInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, "").replace(/\.+$/, "");
}

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export function isValidDomain(domain: string): boolean {
  return DOMAIN_RE.test(domain);
}

export function extractEmailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).toLowerCase();
}

export async function isEmailDomainBlocked(email: string): Promise<boolean> {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  const blocked = await getBlockedEmailDomains();
  return blocked.some((b) => domain === b || domain.endsWith(`.${b}`));
}
