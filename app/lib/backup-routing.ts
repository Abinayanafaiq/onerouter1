import { prisma } from "@/app/lib/prisma";
import { BACKUP_API_KEY, BACKUP_UPSTREAM_MODEL_MAP } from "@/app/lib/constants";

const SETTING_KEY = "backup_upstream_model_map";

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
 * Resolver async yang dipakai route chat. Membaca map efektif (DB override
 * atau default). Return null kalau model tidak di-route ke backup ATAU
 * BACKUP_API_KEY tidak diset (caller pakai upstream master seperti biasa).
 */
export async function resolveBackupUpstreamModelId(modelId: string): Promise<string | null> {
  if (!BACKUP_API_KEY) return null;
  const { map } = await getBackupRoutingMap();
  return map[modelId] ?? null;
}
