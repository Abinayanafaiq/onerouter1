import { prisma } from "./prisma";
import { hashKey, safeHashEqual } from "./apikey";
import { MASTER_API_KEY } from "./constants";
import { resolveModel, type ResolvedModel } from "./models";
import { getWalletBalance, chargeUsage, getOrCreateWallet, logNonBilledUsage, type RequestMeta } from "./wallet";
import { createApiRequestLog } from "./api-request-log";

export type { RequestMeta };

export { logNonBilledUsage };

export type AuthenticatedApiKey = Awaited<ReturnType<typeof authenticateRequest>>;

/**
 * Authenticate an incoming API request from its `Authorization: Bearer` header.
 *
 * Rejects (returns null) for: missing key, malformed header, unknown key,
 * revoked key (`isActive=false`), disabled key (`enabled=false`), expired key,
 * or a client IP not on the key's whitelist (when a whitelist is configured).
 *
 * The stored hash is compared in constant time to mitigate timing attacks.
 * Never exposes the plaintext key or the hash to callers.
 */
export async function authenticateRequest(
  authHeader: string | null,
  opts?: { clientIp?: string | null },
) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const key = authHeader.slice(7).trim();
  if (!key) return null;

  const keyHash = hashKey(key);
  const apiKey = await prisma.apiKey.findUnique({
    include: { user: true },
    where: { keyHash },
  });

  if (!apiKey) return null;
  // Constant-time confirmation of the hash (defense-in-depth against timing).
  if (!safeHashEqual(keyHash, apiKey.keyHash)) return null;
  if (!apiKey.isActive) return null; // revoked
  if (!apiKey.enabled) return null; // disabled by user/admin
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date()) return null; // expired

  // Optional IP whitelist enforcement.
  const whitelist = apiKey.ipWhitelist ?? [];
  if (whitelist.length > 0) {
    const ip = opts?.clientIp?.trim();
    if (!ip || !whitelist.includes(ip)) return null;
  }

  // Touch lastUsedAt without blocking the request path.
  void prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    ...apiKey,
    // Prefer the environment master key so rotating the upstream credential
    // takes effect immediately without migrating every stored ApiKey row.
    // Fall back to the per-key value only if the env key is unset.
    masterApiKey: MASTER_API_KEY || apiKey.masterApiKey || null,
  };
}

/**
 * Whether a key is permitted to use a given model. An empty `allowedModels`
 * list means "no restriction" (all enabled models allowed).
 */
export function isModelAllowed(
  apiKey: { allowedModels: string[] },
  resolvedModel: ResolvedModel,
): boolean {
  const allowed = apiKey.allowedModels ?? [];
  if (allowed.length === 0) return true;
  return allowed.includes(resolvedModel.modelId) || allowed.includes(resolvedModel.masterId);
}

/** Extract the best-guess client IP from request headers. */
export function getClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    null
  );
}

export { createApiRequestLog };

export async function resolveMasterModel(model: string): Promise<ResolvedModel | null> {
  return resolveModel(model);
}

export type BillingInfo = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  remainingBalance: number;
};

export type RecordUsageResult =
  | { ok: true; billing: BillingInfo }
  | { ok: false; error: string };

export async function recordUsageWithBilling(params: {
  userId: string;
  apiKeyId: string;
  resolvedModel: ResolvedModel;
  inputTokens: number;
  outputTokens: number;
  requestMeta?: RequestMeta;
}): Promise<RecordUsageResult> {
  const { userId, apiKeyId, resolvedModel, inputTokens, outputTokens, requestMeta } = params;

  const result = await chargeUsage({
    userId,
    apiKeyId,
    aiModelId: resolvedModel.id,
    modelLabel: resolvedModel.modelId,
    provider: resolvedModel.provider,
    inputTokens,
    outputTokens,
    inputPricePerMillion: resolvedModel.inputPricePerMillion,
    outputPricePerMillion: resolvedModel.outputPricePerMillion,
    requestMeta,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const billing: BillingInfo = {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost: result.inputCost,
    outputCost: result.outputCost,
    totalCost: result.totalCost,
    remainingBalance: result.newBalance,
  };

  return { ok: true, billing };
}

export async function checkSufficientBalance(
  userId: string,
  estimatedCost: number,
): Promise<boolean> {
  const balance = await getWalletBalance(userId);
  return balance >= estimatedCost;
}

/**
 * Rough token estimate from a chat `messages` array using a chars/4 heuristic.
 * Used only for the pre-flight minimum-credit check; actual billing always
 * uses the real token usage reported by the upstream provider.
 */
export function estimatePromptTokens(messages: unknown): number {
  if (!Array.isArray(messages)) return 0;
  let chars = 0;
  for (const m of messages) {
    if (m && typeof m === "object") {
      const content = (m as { content?: unknown }).content;
      if (typeof content === "string") {
        chars += content.length;
      } else if (Array.isArray(content)) {
        for (const part of content) {
          const text = (part as { text?: unknown })?.text;
          if (typeof text === "string") chars += text.length;
        }
      }
    }
  }
  return Math.ceil(chars / 4);
}

/**
 * Estimate the minimum credit required for a request so we can reject it
 * up-front when the wallet clearly cannot cover even the input cost plus a
 * small output floor. Returns cost in IDR.
 */
export function estimateMinimumCost(params: {
  resolvedModel: ResolvedModel;
  promptTokens: number;
  maxOutputTokens: number;
}): number {
  const { resolvedModel, promptTokens, maxOutputTokens } = params;
  // Require at least the input cost plus a small output floor (min 32 tokens)
  // so a request can't slip through with a near-empty wallet.
  const outputFloor = Math.min(Math.max(maxOutputTokens, 32), 512);
  const inputCost = (promptTokens / 1_000_000) * resolvedModel.inputPricePerMillion;
  const outputCost = (outputFloor / 1_000_000) * resolvedModel.outputPricePerMillion;
  return inputCost + outputCost;
}

export async function ensureWallet(userId: string) {
  return getOrCreateWallet(userId);
}

export function errorResponse(
  message: string,
  status: number,
  type = "invalid_request_error",
) {
  return Response.json(
    {
      error: {
        message,
        type,
        param: null,
        code: null,
      },
    },
    { status },
  );
}
