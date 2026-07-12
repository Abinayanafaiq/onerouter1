import { prisma } from "./prisma";
import { generateApiKey, hashKey, maskFromParts, maskKey } from "./apikey";
import { MASTER_API_KEY } from "./constants";
import type { Prisma } from "@prisma/client";

/**
 * A safe, serializable representation of an API key for client/UI use.
 * Never contains the plaintext key or the hash.
 */
export type ApiKeyView = {
  id: string;
  name: string;
  maskedKey: string;
  prefix: string | null;
  last4: string | null;
  enabled: boolean;
  isActive: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  lastUsedAt: string | null;
  ipWhitelist: string[];
  rateLimit: number | null;
  allowedModels: string[];
  requestCount: number;
  createdAt: string;
  updatedAt: string;
};

type ApiKeyRow = Prisma.ApiKeyGetPayload<Record<string, never>>;

function isExpired(expiresAt: Date | null): boolean {
  return expiresAt ? new Date(expiresAt) <= new Date() : false;
}

export function toApiKeyView(k: ApiKeyRow): ApiKeyView {
  // Prefer masking from stored prefix/last4 (no plaintext needed). Fall back to
  // masking the legacy plaintext key only if prefix/last4 are absent.
  const masked =
    k.prefix || k.last4
      ? maskFromParts(k.prefix, k.last4)
      : k.key
        ? maskKey(k.key)
        : "sk_live_" + "*".repeat(32);

  return {
    id: k.id,
    name: k.name || k.label || "API Key",
    maskedKey: masked,
    prefix: k.prefix,
    last4: k.last4,
    enabled: k.enabled,
    isActive: k.isActive,
    expiresAt: k.expiresAt ? k.expiresAt.toISOString() : null,
    isExpired: isExpired(k.expiresAt),
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    ipWhitelist: k.ipWhitelist ?? [],
    rateLimit: k.rateLimit ?? null,
    allowedModels: k.allowedModels ?? [],
    requestCount: k.requestCount,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  };
}

export async function listApiKeys(userId: string): Promise<ApiKeyView[]> {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return keys.map(toApiKeyView);
}

export type CreateApiKeyInput = {
  userId: string;
  name: string;
  expiresAt?: Date | null;
  ipWhitelist?: string[];
  rateLimit?: number | null;
  allowedModels?: string[];
};

export type CreateApiKeyResult = {
  view: ApiKeyView;
  /** Full plaintext key — returned exactly once, at creation time. */
  plaintext: string;
};

export async function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  const generated = generateApiKey();
  const created = await prisma.apiKey.create({
    data: {
      userId: input.userId,
      key: null,
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      last4: generated.last4,
      name: input.name,
      label: input.name,
      masterApiKey: MASTER_API_KEY || null,
      enabled: true,
      isActive: true,
      ipWhitelist: input.ipWhitelist ?? [],
      rateLimit: input.rateLimit ?? null,
      allowedModels: input.allowedModels ?? [],
      expiresAt: input.expiresAt ?? null,
      lastResetDay: new Date(),
    },
  });
  return { view: toApiKeyView(created), plaintext: generated.key };
}

/** Verify a key belongs to the user before mutating it. */
async function ownedKey(userId: string, keyId: string): Promise<ApiKeyRow | null> {
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId } });
  return key;
}

export type UpdateApiKeyInput = {
  name?: string;
  enabled?: boolean;
  expiresAt?: Date | null;
  ipWhitelist?: string[];
  rateLimit?: number | null;
  allowedModels?: string[];
};

export async function updateApiKey(
  userId: string,
  keyId: string,
  patch: UpdateApiKeyInput,
): Promise<ApiKeyView | null> {
  const existing = await ownedKey(userId, keyId);
  if (!existing) return null;

  const data: Prisma.ApiKeyUpdateInput = {};
  if (patch.name !== undefined) {
    data.name = patch.name;
    data.label = patch.name;
  }
  if (patch.enabled !== undefined) data.enabled = patch.enabled;
  if (patch.expiresAt !== undefined) data.expiresAt = patch.expiresAt;
  if (patch.ipWhitelist !== undefined) data.ipWhitelist = patch.ipWhitelist;
  if (patch.rateLimit !== undefined) data.rateLimit = patch.rateLimit;
  if (patch.allowedModels !== undefined) data.allowedModels = patch.allowedModels;

  const updated = await prisma.apiKey.update({ where: { id: keyId }, data });
  return toApiKeyView(updated);
}

/**
 * Regenerate: rotate the secret in place. The key id (and its usage history)
 * is preserved; the old secret is invalidated immediately. Returns the new
 * plaintext once.
 */
export async function regenerateApiKey(
  userId: string,
  keyId: string,
): Promise<CreateApiKeyResult | null> {
  const existing = await ownedKey(userId, keyId);
  if (!existing) return null;

  const generated = generateApiKey();
  const updated = await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      key: null,
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      last4: generated.last4,
      // Rotating re-activates the key material; keep the user's enabled state.
      isActive: true,
    },
  });
  return { view: toApiKeyView(updated), plaintext: generated.key };
}

export async function setApiKeyEnabled(
  userId: string,
  keyId: string,
  enabled: boolean,
): Promise<ApiKeyView | null> {
  return updateApiKey(userId, keyId, { enabled });
}

export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  const existing = await ownedKey(userId, keyId);
  if (!existing) return false;
  await prisma.apiKey.delete({ where: { id: keyId } });
  return true;
}

/** Per-key usage statistics for the dashboard. */
export type ApiKeyStats = {
  keyId: string;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgResponseTime: number;
  lastUsedAt: string | null;
};

export async function getApiKeyStats(userId: string, keyId: string): Promise<ApiKeyStats | null> {
  const key = await ownedKey(userId, keyId);
  if (!key) return null;

  const [agg, successCount, failedCount, avgAgg] = await Promise.all([
    prisma.apiRequestLog.aggregate({
      where: { apiKeyId: keyId },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true, totalCost: true },
      _count: true,
    }),
    prisma.apiRequestLog.count({ where: { apiKeyId: keyId, success: true } }),
    prisma.apiRequestLog.count({ where: { apiKeyId: keyId, success: false } }),
    prisma.apiRequestLog.aggregate({
      where: { apiKeyId: keyId },
      _avg: { responseTime: true },
    }),
  ]);

  const totalRequests = agg._count;
  return {
    keyId,
    totalRequests,
    totalInputTokens: agg._sum.inputTokens ?? 0,
    totalOutputTokens: agg._sum.outputTokens ?? 0,
    totalTokens: agg._sum.totalTokens ?? 0,
    totalCost: Number(agg._sum.totalCost ?? 0),
    successCount,
    failedCount,
    successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
    avgResponseTime: Math.round(avgAgg._avg.responseTime ?? 0),
    lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
  };
}

/** Stats for every key belonging to a user, plus the current wallet balance. */
export async function getAllApiKeyStats(
  userId: string,
): Promise<{ stats: Record<string, ApiKeyStats>; remainingBalance: number }> {
  const [keys, wallet] = await Promise.all([
    prisma.apiKey.findMany({ where: { userId }, select: { id: true, lastUsedAt: true } }),
    prisma.wallet.findUnique({ where: { userId } }),
  ]);

  const keyIds = keys.map((k) => k.id);
  const lastUsedById = new Map(keys.map((k) => [k.id, k.lastUsedAt]));

  if (keyIds.length === 0) {
    return { stats: {}, remainingBalance: Number(wallet?.balance ?? 0) };
  }

  const [grouped, successGrouped, avgGrouped] = await Promise.all([
    prisma.apiRequestLog.groupBy({
      by: ["apiKeyId"],
      where: { apiKeyId: { in: keyIds } },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true, totalCost: true },
      _count: true,
    }),
    prisma.apiRequestLog.groupBy({
      by: ["apiKeyId"],
      where: { apiKeyId: { in: keyIds }, success: true },
      _count: true,
    }),
    prisma.apiRequestLog.groupBy({
      by: ["apiKeyId"],
      where: { apiKeyId: { in: keyIds } },
      _avg: { responseTime: true },
    }),
  ]);

  const successById = new Map(successGrouped.map((g) => [g.apiKeyId, g._count]));
  const avgById = new Map(avgGrouped.map((g) => [g.apiKeyId, g._avg.responseTime ?? 0]));

  const stats: Record<string, ApiKeyStats> = {};
  for (const id of keyIds) {
    stats[id] = {
      keyId: id,
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      successCount: 0,
      failedCount: 0,
      successRate: 0,
      avgResponseTime: 0,
      lastUsedAt: lastUsedById.get(id)?.toISOString() ?? null,
    };
  }

  for (const g of grouped) {
    const total = g._count;
    const success = successById.get(g.apiKeyId) ?? 0;
    stats[g.apiKeyId] = {
      keyId: g.apiKeyId,
      totalRequests: total,
      totalInputTokens: g._sum.inputTokens ?? 0,
      totalOutputTokens: g._sum.outputTokens ?? 0,
      totalTokens: g._sum.totalTokens ?? 0,
      totalCost: Number(g._sum.totalCost ?? 0),
      successCount: success,
      failedCount: total - success,
      successRate: total > 0 ? (success / total) * 100 : 0,
      avgResponseTime: Math.round(avgById.get(g.apiKeyId) ?? 0),
      lastUsedAt: lastUsedById.get(g.apiKeyId)?.toISOString() ?? null,
    };
  }

  return { stats, remainingBalance: Number(wallet?.balance ?? 0) };
}
