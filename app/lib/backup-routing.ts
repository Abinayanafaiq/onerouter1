import { prisma } from "@/app/lib/prisma";
import { BACKUP_API_KEY, BACKUP_API_URL, BACKUP_UPSTREAM_MODEL_MAP } from "@/app/lib/constants";

const SETTING_KEY = "backup_upstream_model_map";
const URL_SETTING_KEY = "backup_upstream_url";

export type BackupRoutingMap = Record<string, string>;

/**
 * Backup upstream routing yang bisa diubah dari halaman admin.
 *
 * Map disimpan sebagai JSON di tabel Setting (key: backup_upstream_model_map).
 * Kalau belum ada baris di database, dipakai BACKUP_UPSTREAM_MODEL_MAP dari
 * constants.ts sebagai default. Begitu admin menyimpan dari halaman Pengaturan,
 * isi database MENGGANTIKAN seluruh default (bukan merge) — jadi admin punya
 * kendali penuh, termasuk mengosongkan map untuk mematikan routing backup.
 */

function sanitizeMap(input: unknown): BackupRoutingMap | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: BackupRoutingMap = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const key = k.trim();
    const value = typeof v === "string" ? v.trim() : "";
    if (!key || !value) return null;
    out[key] = value;
  }
  return out;
}

/** Validasi map dari input admin. Return null kalau ada key/value kosong. */
export function validateBackupRoutingMap(input: unknown): BackupRoutingMap | null {
  return sanitizeMap(input);
}

export async function getBackupRoutingMap(): Promise<{
  map: BackupRoutingMap;
  source: "database" | "default";
}> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (row?.value) {
    try {
      const parsed = sanitizeMap(JSON.parse(row.value));
      if (parsed) return { map: parsed, source: "database" };
    } catch {
      // JSON rusak — jatuh ke default di bawah.
    }
  }
  return { map: { ...BACKUP_UPSTREAM_MODEL_MAP }, source: "default" };
}

export async function saveBackupRoutingMap(map: BackupRoutingMap): Promise<void> {
  const value = JSON.stringify(map);
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value },
    create: { key: SETTING_KEY, value },
  });
}

/** Hapus override di database — routing kembali ke default dari kode. */
export async function resetBackupRoutingMap(): Promise<void> {
  await prisma.setting.deleteMany({ where: { key: SETTING_KEY } });
}

/**
 * Base URL backup upstream — juga bisa diubah dari halaman admin.
 *
 * Disimpan sebagai string polos di tabel Setting (key: backup_upstream_url).
 * Kalau belum ada baris di database, dipakai BACKUP_API_URL dari constants.ts
 * (env BACKUP_API_URL atau fallback hardcoded) sebagai default.
 */

/**
 * Validasi URL dari input admin. Hanya menerima http/https; trailing slash
 * dibuang supaya caller bisa menempelkan path langsung. Return null kalau
 * tidak valid.
 */
export function validateBackupUpstreamUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return trimmed;
}

export async function getBackupUpstreamUrl(): Promise<{
  url: string;
  source: "database" | "default";
}> {
  const row = await prisma.setting.findUnique({ where: { key: URL_SETTING_KEY } });
  if (row?.value) {
    // Validasi ulang saat baca — nilai rusak/disuntik manual jatuh ke default.
    const valid = validateBackupUpstreamUrl(row.value);
    if (valid) return { url: valid, source: "database" };
  }
  return { url: BACKUP_API_URL.replace(/\/+$/, ""), source: "default" };
}

export async function saveBackupUpstreamUrl(url: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: URL_SETTING_KEY },
    update: { value: url },
    create: { key: URL_SETTING_KEY, value: url },
  });
}

/** Hapus override URL di database — kembali ke default dari kode/env. */
export async function resetBackupUpstreamUrl(): Promise<void> {
  await prisma.setting.deleteMany({ where: { key: URL_SETTING_KEY } });
}

export type ResolvedBackupUpstream = {
  /** Model ID yang dipahami backup upstream. */
  upstreamModelId: string;
  /** Base URL backup upstream efektif (DB override atau default, tanpa trailing slash). */
  url: string;
};

/**
 * Resolver async yang dipakai route chat. Membaca map + URL efektif (DB
 * override atau default). Return null kalau model tidak di-route ke backup
 * ATAU BACKUP_API_KEY tidak diset (caller pakai upstream master seperti biasa).
 */
export async function resolveBackupUpstream(modelId: string): Promise<ResolvedBackupUpstream | null> {
  if (!BACKUP_API_KEY) return null;
  const [{ map }, { url }] = await Promise.all([getBackupRoutingMap(), getBackupUpstreamUrl()]);
  const upstreamModelId = map[modelId];
  if (!upstreamModelId) return null;
  return { upstreamModelId, url };
}

/**
 * @deprecated Gunakan `resolveBackupUpstream` yang sekaligus mengembalikan
 * URL efektif. Versi ini hanya mengembalikan upstream model ID.
 */
export async function resolveBackupUpstreamModelId(modelId: string): Promise<string | null> {
  const resolved = await resolveBackupUpstream(modelId);
  return resolved?.upstreamModelId ?? null;
}
