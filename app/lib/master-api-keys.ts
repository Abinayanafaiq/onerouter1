import { prisma } from "./prisma";
import { encryptSecret, decryptSecret } from "./crypto-vault";
import { prefixOf } from "./apikey";

/**
 * Masked view of a MasterApiKey — never contains the plaintext key.
 * Used for all list/display responses.
 */
export type MasterApiKeyView = {
  id: string;
  label: string;
  maskedKey: string;
  prefix: string | null;
  last4: string | null;
  priority: number;
  enabled: boolean;
  lastUsedAt: string | null;
  lastErrorAt: string | null;
  lastErrorStatus: number | null;
  lastErrorMsg: string | null;
  createdAt: string;
  updatedAt: string;
};

function maskKey(prefix: string | null, last4: string | null): string {
  const head = prefix || "sk_";
  const tail = last4 || "****";
  return `${head}…${tail}`;
}

function toView(row: {
  id: string;
  label: string;
  prefix: string | null;
  last4: string | null;
  priority: number;
  enabled: boolean;
  lastUsedAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorStatus: number | null;
  lastErrorMsg: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MasterApiKeyView {
  return {
    id: row.id,
    label: row.label,
    maskedKey: maskKey(row.prefix, row.last4),
    prefix: row.prefix,
    last4: row.last4,
    priority: row.priority,
    enabled: row.enabled,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    lastErrorAt: row.lastErrorAt?.toISOString() ?? null,
    lastErrorStatus: row.lastErrorStatus,
    lastErrorMsg: row.lastErrorMsg,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * List all master API keys (masked only — never returns plaintext).
 */
export async function listMasterApiKeys(): Promise<MasterApiKeyView[]> {
  const rows = await prisma.masterApiKey.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toView);
}

/**
 * Create a new master API key. The plaintext is encrypted at rest immediately
 * and never stored or returned again. Only prefix + last4 are kept for display.
 */
export async function createMasterApiKey(params: {
  plaintext: string;
  label: string;
  priority: number;
}): Promise<MasterApiKeyView> {
  const { plaintext, label, priority } = params;
  const trimmedKey = plaintext.trim();
  if (!trimmedKey) throw new Error("Master key cannot be empty");
  if (!label.trim()) throw new Error("Label cannot be empty");

  const cipher = encryptSecret(trimmedKey);
  const prefix = prefixOf(trimmedKey);
  const last4 = trimmedKey.slice(-4);

  const row = await prisma.masterApiKey.create({
    data: {
      label: label.trim(),
      cipher,
      prefix,
      last4,
      priority: Math.max(0, Math.floor(priority)),
      enabled: true,
    },
  });

  return toView(row);
}

export type UpdateMasterApiKeyInput = {
  label?: string;
  priority?: number;
  enabled?: boolean;
};

export async function updateMasterApiKey(
  id: string,
  patch: UpdateMasterApiKeyInput,
): Promise<MasterApiKeyView | null> {
  const existing = await prisma.masterApiKey.findUnique({ where: { id } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const label = patch.label.trim();
    if (!label) throw new Error("Label cannot be empty");
    data.label = label;
  }
  if (patch.priority !== undefined) {
    data.priority = Math.max(0, Math.floor(patch.priority));
  }
  if (patch.enabled !== undefined) {
    data.enabled = patch.enabled;
    if (patch.enabled) {
      data.lastErrorAt = null;
      data.lastErrorStatus = null;
      data.lastErrorMsg = null;
    }
  }

  const updated = await prisma.masterApiKey.update({ where: { id }, data });
  return toView(updated);
}

/**
 * Delete a single master key row. Only deletes this credential record;
 * does not affect any tables or other data.
 */
export async function deleteMasterApiKey(id: string): Promise<boolean> {
  const existing = await prisma.masterApiKey.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.masterApiKey.delete({ where: { id } });
  return true;
}

/** Cooldown window: a key that errored within this period is skipped. */
const ERROR_COOLDOWN_MS = 60_000;

/**
 * Returns the highest-priority enabled key whose last error is NOT within the
 * cooldown window — i.e. the next usable key for a request.
 *
 * The plaintext is decrypted transiently for the request and must not be
 * cached. The caller should use it and let it go out of scope ASAP.
 */
export async function getActiveMasterKeyForRequest(): Promise<{
  id: string;
  plaintext: string;
} | null> {
  const enabledKeys = await prisma.masterApiKey.findMany({
    where: { enabled: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  if (enabledKeys.length === 0) return null;

  const now = Date.now();
  for (const key of enabledKeys) {
    const inCooldown =
      key.lastErrorAt &&
      now - key.lastErrorAt.getTime() < ERROR_COOLDOWN_MS;
    if (inCooldown) continue;

    const plaintext = decryptSecret(key.cipher);
    return { id: key.id, plaintext };
  }

  return null;
}

/**
 * Count of enabled master keys in the database. Used to determine whether
 * the env-var fallback should be used.
 */
export async function countEnabledMasterKeys(): Promise<number> {
  return prisma.masterApiKey.count({ where: { enabled: true } });
}

/**
 * Mark a key as errored (e.g. upstream returned 401/403/429/5xx).
 * Stores the HTTP status and a truncated error message.
 */
export async function markKeyError(
  id: string,
  status: number,
  msg: string,
): Promise<void> {
  try {
    await prisma.masterApiKey.update({
      where: { id },
      data: {
        lastErrorAt: new Date(),
        lastErrorStatus: status,
        lastErrorMsg: msg.slice(0, 500),
      },
    });
  } catch (e) {
    console.error("[master-api-keys] markKeyError failed:", e);
  }
}

/**
 * Mark a key as successfully used. Clears any prior error state and
 * records the last-used timestamp.
 */
export async function markKeySuccess(id: string): Promise<void> {
  try {
    await prisma.masterApiKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        lastErrorAt: null,
        lastErrorStatus: null,
        lastErrorMsg: null,
      },
    });
  } catch (e) {
    console.error("[master-api-keys] markKeySuccess failed:", e);
  }
}

/**
 * Mask a plaintext key for logging: prefix…last4. NEVER log the full key.
 */
export function maskForKeyLog(plaintext: string): string {
  const prefix = prefixOf(plaintext);
  const last4 = plaintext.slice(-4);
  return `${prefix}…${last4}`;
}
