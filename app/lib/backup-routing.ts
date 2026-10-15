import { prisma } from "@/app/lib/prisma";
import { BACKUP_API_KEY, BACKUP_API_URL, BACKUP_UPSTREAM_MODEL_MAP } from "@/app/lib/constants";
import { encryptSecret, decryptSecret } from "@/app/lib/crypto-vault";

const SETTING_KEY = "backup_upstream_model_map";
const URL_SETTING_KEY = "backup_upstream_url";
const EXTRA_SETTING_KEY = "backup_upstreams_extra";

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
  return parseMapSetting(row?.value);
}

function parseMapSetting(value: string | undefined): {
  map: BackupRoutingMap;
  source: "database" | "default";
} {
  if (value) {
    try {
      const parsed = sanitizeMap(JSON.parse(value));
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
  return parseUrlSetting(row?.value);
}

function parseUrlSetting(value: string | undefined): {
  url: string;
  source: "database" | "default";
} {
  if (value) {
    // Validasi ulang saat baca — nilai rusak/disuntik manual jatuh ke default.
    const valid = validateBackupUpstreamUrl(value);
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

/**
 * Upstream backup TAMBAHAN — bisa ditambah sebanyak apa pun dari halaman admin.
 *
 * Upstream #1 di atas (URL + map + BACKUP_API_KEY env) tetap seperti semula.
 * Upstream tambahan masing-masing punya label, URL, API key sendiri, dan map
 * model ID. Disimpan sebagai satu JSON array di tabel Setting
 * (key: backup_upstreams_extra). API key dienkripsi AES-256-GCM (sama seperti
 * master key) dan tidak pernah dikirim balik ke browser.
 */
export type ExtraUpstream = {
  id: string;
  label: string;
  url: string;
  apiKeyCipher: string;
  enabled: boolean;
  map: BackupRoutingMap;
};

/** Tampilan aman untuk admin — tanpa API key. */
export type ExtraUpstreamView = Omit<ExtraUpstream, "apiKeyCipher"> & {
  apiKeySet: boolean;
};

function sanitizeExtra(input: unknown): ExtraUpstream | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const r = input as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim() : "";
  const label = typeof r.label === "string" ? r.label.trim() : "";
  const url = validateBackupUpstreamUrl(r.url);
  const apiKeyCipher = typeof r.apiKeyCipher === "string" ? r.apiKeyCipher : "";
  const map = sanitizeMap(r.map);
  if (!id || !url || !map) return null;
  return { id, label, url, apiKeyCipher, enabled: r.enabled !== false, map };
}

function parseExtraSetting(value: string | undefined): ExtraUpstream[] {
  if (!value) return [];
  try {
    const arr = JSON.parse(value);
    if (!Array.isArray(arr)) return [];
    // Entri rusak dilewati satu per satu, bukan membuang seluruh daftar.
    return arr.map(sanitizeExtra).filter((u): u is ExtraUpstream => u !== null);
  } catch {
    return [];
  }
}

export function toExtraUpstreamView(u: ExtraUpstream): ExtraUpstreamView {
  return {
    id: u.id,
    label: u.label,
    url: u.url,
    enabled: u.enabled,
    map: u.map,
    apiKeySet: !!u.apiKeyCipher,
  };
}

export async function getExtraUpstreams(): Promise<ExtraUpstream[]> {
  const row = await prisma.setting.findUnique({ where: { key: EXTRA_SETTING_KEY } });
  return parseExtraSetting(row?.value);
}

export type ExtraUpstreamInput = {
  id?: unknown;
  label?: unknown;
  url?: unknown;
  /** Kosong = pertahankan API key lama (untuk upstream yang sudah ada). */
  apiKey?: unknown;
  enabled?: unknown;
  map?: unknown;
};

/**
 * Validasi daftar upstream tambahan dari admin lalu gabungkan dengan API key
 * lama (terenkripsi). Return pesan error (string) kalau tidak valid.
 * `primaryMap` dipakai untuk menolak model ID yang sudah ada di upstream #1.
 */
export function buildExtraUpstreams(
  input: unknown,
  existing: ExtraUpstream[],
  primaryMap: BackupRoutingMap,
): ExtraUpstream[] | string {
  if (!Array.isArray(input)) return "Format daftar upstream tidak valid";
  const byId = new Map(existing.map((u) => [u.id, u]));
  const seenModels = new Map<string, string>(); // model ID publik -> nama upstream
  const out: ExtraUpstream[] = [];

  for (const [i, raw] of (input as ExtraUpstreamInput[]).entries()) {
    const fallbackName = `Upstream #${i + 2}`;
    if (!raw || typeof raw !== "object") return `${fallbackName}: format tidak valid`;
    const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 80) : "";
    const name = label || fallbackName;
    const url = validateBackupUpstreamUrl(raw.url);
    if (!url) return `${name}: URL harus diawali http:// atau https://`;
    const map = sanitizeMap(raw.map);
    if (!map) return `${name}: semua model ID publik dan model ID upstream harus terisi`;

    for (const modelId of Object.keys(map)) {
      if (modelId in primaryMap) {
        return `${name}: model "${modelId}" sudah dipakai di Upstream #1`;
      }
      const other = seenModels.get(modelId);
      if (other) return `${name}: model "${modelId}" sudah dipakai di ${other}`;
      seenModels.set(modelId, name);
    }

    const prev = typeof raw.id === "string" ? byId.get(raw.id) : undefined;
    const newKey = typeof raw.apiKey === "string" ? raw.apiKey.trim() : "";
    let apiKeyCipher = prev?.apiKeyCipher ?? "";
    if (newKey) apiKeyCipher = encryptSecret(newKey);
    if (!apiKeyCipher) return `${name}: API key wajib diisi`;

    out.push({
      id: prev?.id ?? crypto.randomUUID(),
      label,
      url,
      apiKeyCipher,
      enabled: raw.enabled !== false,
      map,
    });
  }
  return out;
}

export async function saveExtraUpstreams(list: ExtraUpstream[]): Promise<void> {
  const value = JSON.stringify(list);
  await prisma.setting.upsert({
    where: { key: EXTRA_SETTING_KEY },
    update: { value },
    create: { key: EXTRA_SETTING_KEY, value },
  });
}

/** Model ID publik yang dipakai upstream tambahan → nama upstream (cek bentrok). */
export function extraUpstreamModelOwners(list: ExtraUpstream[]): Map<string, string> {
  const owners = new Map<string, string>();
  list.forEach((u, i) => {
    for (const modelId of Object.keys(u.map)) {
      if (!owners.has(modelId)) owners.set(modelId, u.label || `Upstream #${i + 2}`);
    }
  });
  return owners;
}

export type ResolvedBackupUpstream = {
  /** Model ID yang dipahami backup upstream. */
  upstreamModelId: string;
  /** Base URL backup upstream efektif (DB override atau default, tanpa trailing slash). */
  url: string;
  /** API key upstream ini: BACKUP_API_KEY untuk #1, key terdekripsi untuk upstream tambahan. */
  apiKey: string;
  /** Nama untuk log — "backup-upstream" untuk #1, "backup-upstream:<label>" untuk tambahan. */
  label: string;
};

/**
 * Resolver async yang dipakai route chat. Membaca semua setting routing dalam
 * SATU query (pool koneksi kecil), lalu mencari model di upstream #1 dulu,
 * kemudian upstream tambahan sesuai urutan. Return null kalau model tidak
 * di-route ke backup mana pun (caller pakai upstream master seperti biasa).
 * Upstream #1 hanya aktif kalau BACKUP_API_KEY diset.
 */
export async function resolveBackupUpstream(modelId: string): Promise<ResolvedBackupUpstream | null> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [SETTING_KEY, URL_SETTING_KEY, EXTRA_SETTING_KEY] } },
  });
  const get = (key: string) => rows.find((r) => r.key === key)?.value;

  if (BACKUP_API_KEY) {
    const { map } = parseMapSetting(get(SETTING_KEY));
    const upstreamModelId = map[modelId];
    if (upstreamModelId) {
      const { url } = parseUrlSetting(get(URL_SETTING_KEY));
      return { upstreamModelId, url, apiKey: BACKUP_API_KEY, label: "backup-upstream" };
    }
  }

  for (const u of parseExtraSetting(get(EXTRA_SETTING_KEY))) {
    if (!u.enabled || !u.apiKeyCipher) continue;
    const upstreamModelId = u.map[modelId];
    if (!upstreamModelId) continue;
    let apiKey: string;
    try {
      apiKey = decryptSecret(u.apiKeyCipher);
    } catch (e) {
      console.error(`[backup-routing] gagal dekripsi API key upstream ${u.label || u.id}:`, e);
      continue;
    }
    return {
      upstreamModelId,
      url: u.url,
      apiKey,
      label: `backup-upstream:${u.label || u.id}`,
    };
  }
  return null;
}

/**
 * @deprecated Gunakan `resolveBackupUpstream` yang sekaligus mengembalikan
 * URL efektif. Versi ini hanya mengembalikan upstream model ID.
 */
export async function resolveBackupUpstreamModelId(modelId: string): Promise<string | null> {
  const resolved = await resolveBackupUpstream(modelId);
  return resolved?.upstreamModelId ?? null;
}
