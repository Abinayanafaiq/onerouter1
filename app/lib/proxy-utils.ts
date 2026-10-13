import { createHmac } from "crypto";
import { prisma } from "./prisma";
import { hashKey, safeHashEqual } from "./apikey";
import { resolveModel, type ResolvedModel } from "./models";
import {
  getWalletBalance,
  chargeUsage,
  getOrCreateWallet,
  logNonBilledUsage,
  reserveCredits,
  settleUsage,
  releaseReservation,
  type RequestMeta,
  type ReserveResult,
  type SettleResult,
} from "./wallet";
import { createApiRequestLog } from "./api-request-log";

export type { RequestMeta, ReserveResult, SettleResult };
export { logNonBilledUsage, reserveCredits, settleUsage, releaseReservation };

/**
 * Max time to wait for the upstream to start responding (connect +
 * time-to-first-byte). The timer is cleared as soon as response headers
 * arrive, so long-running SSE streams are NOT cut off — only genuinely
 * hung upstream connections are aborted.
 */
export const UPSTREAM_RESPONSE_TIMEOUT_MS = 90_000;

/** Backoff between upstream retry attempts (ms). Indexed by attempt number. */
export const UPSTREAM_RETRY_BACKOFF_MS = [400, 900];

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch() wrapper that aborts if the upstream takes longer than
 * UPSTREAM_RESPONSE_TIMEOUT_MS to return response headers. Without this, a
 * hung origin connection can hold a request (and its wallet reservation)
 * open almost indefinitely.
 */
export function fetchUpstream(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_RESPONSE_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

export type AggregatedCompletion = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: {
    index: number;
    // Besides `content`, carries whatever else the upstream streamed
    // (tool_calls, reasoning/reasoning_content, future fields).
    message: { role: "assistant"; content: string } & Record<string, unknown>;
    finish_reason: string;
  }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

// String fields that identify a delta rather than extend it. Some upstreams
// repeat them on every chunk, so they are replaced instead of concatenated
// (otherwise `type` ends up as "functionfunction").
const DELTA_IDENTITY_KEYS = new Set(["role", "type", "id", "name"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Fold one streamed delta into the accumulated value without knowing the
 * field names: strings are concatenated, objects merged recursively, arrays
 * merged by each element's `index` (how tool_calls are streamed), anything
 * else is replaced. Null/undefined deltas never overwrite accumulated data.
 */
function mergeDelta(target: unknown, delta: unknown, key?: string): unknown {
  if (delta === null || delta === undefined) return target;
  if (typeof delta === "string") {
    if (key && DELTA_IDENTITY_KEYS.has(key)) return delta || target;
    return typeof target === "string" ? target + delta : delta;
  }
  if (Array.isArray(delta)) {
    const merged: unknown[] = Array.isArray(target) ? [...target] : [];
    for (const item of delta) {
      const index = isPlainObject(item) && typeof item.index === "number" ? item.index : -1;
      const at = index >= 0
        ? merged.findIndex((existing) => isPlainObject(existing) && existing.index === index)
        : -1;
      if (at >= 0) merged[at] = mergeDelta(merged[at], item);
      else merged.push(mergeDelta(undefined, item));
    }
    return merged;
  }
  if (isPlainObject(delta)) {
    const merged: Record<string, unknown> = isPlainObject(target) ? { ...target } : {};
    for (const [k, v] of Object.entries(delta)) merged[k] = mergeDelta(merged[k], v, k);
    return merged;
  }
  return delta;
}

/**
 * Read an upstream SSE stream (requested with stream=true) and fold it back
 * into a standard non-streaming chat.completion object. Every delta field is
 * aggregated generically (see mergeDelta), so tool_calls, reasoning fields
 * and fields the upstream adds later all reach the client. Returns null on
 * transport failure.
 *
 * Workaround helper: the upstream origin crashes (Cloudflare 520) on
 * non-streaming chat completions, so routes always request a stream upstream
 * and use this to serve clients that asked for a regular JSON response.
 */
export async function aggregateUpstreamStream(
  upstream: Response,
): Promise<AggregatedCompletion | null> {
  if (!upstream.body) return null;

  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buffer = "";
  const choices = new Map<number, { message: Record<string, unknown>; finishReason: string }>();
  let id = "";
  let created = 0;
  let model = "";
  let promptTokens = 0;
  let completionTokens = 0;

  function handleLine(line: string) {
    if (!line.startsWith("data: ")) return;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const chunk = JSON.parse(payload) as {
        id?: string;
        created?: number;
        model?: string;
        choices?: {
          index?: number;
          delta?: Record<string, unknown>;
          finish_reason?: string | null;
        }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
      };
      if (chunk.id) id = chunk.id;
      if (chunk.created) created = chunk.created;
      if (chunk.model) model = chunk.model;
      for (const choice of chunk.choices ?? []) {
        const index = typeof choice.index === "number" ? choice.index : 0;
        const entry = choices.get(index) ?? { message: {}, finishReason: "stop" };
        if (choice.delta) {
          entry.message = mergeDelta(entry.message, choice.delta) as Record<string, unknown>;
        }
        if (choice.finish_reason) entry.finishReason = choice.finish_reason;
        choices.set(index, entry);
      }
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens || 0;
        completionTokens = chunk.usage.completion_tokens || 0;
      }
    } catch {
      // Skip malformed SSE chunks.
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) handleLine(line);
    }
    if (buffer) handleLine(buffer);
  } catch {
    return null;
  }

  if (choices.size === 0) choices.set(0, { message: {}, finishReason: "stop" });

  return {
    id: id || `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: created || Math.floor(Date.now() / 1000),
    model,
    choices: [...choices.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, { message, finishReason }]) => ({
        index,
        message: {
          ...message,
          role: "assistant" as const,
          content: typeof message.content === "string" ? message.content : "",
        },
        finish_reason: finishReason,
      })),
    ...(promptTokens > 0 || completionTokens > 0
      ? {
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
          },
        }
      : {}),
  };
}

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
    // Master key is now resolved per-request from the DB (with env fallback)
    // by the route handler via app/lib/master-api-keys.ts. This field is kept
    // for type compatibility but is no longer used for upstream auth.
    masterApiKey: null,
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

/**
 * Stable, pseudonymous per-user identifier sent to the upstream provider as
 * the `x-session-hash` header, so the upstream can recognize that consecutive
 * requests come from the same end user without ever seeing the real user ID.
 *
 * HMAC-SHA256 of the user ID, keyed by SESSION_HASH_SECRET (falls back to
 * NEXTAUTH_SECRET) so the upstream cannot reverse it into a user ID even if
 * it knows our ID format. Rotate the secret to re-anonymize all users.
 */
export function computeSessionHash(userId: string): string {
  const secret =
    process.env.SESSION_HASH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "onerouter-session-hash";
  return createHmac("sha256", secret).update(userId).digest("hex");
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

/**
 * Settle a credit reservation against the actual upstream usage. Wraps
 * {@link settleUsage} with the resolved model's pricing and returns a
 * {@link BillingInfo} object suitable for attaching to the API response.
 *
 * This is the post-response step in the reserve → forward → settle flow.
 */
export async function settleReservation(params: {
  userId: string;
  apiKeyId: string;
  walletId: string;
  reservedAmount: number;
  resolvedModel: ResolvedModel;
  inputTokens: number;
  outputTokens: number;
  requestMeta?: RequestMeta;
}): Promise<RecordUsageResult & { refunded?: number }> {
  const {
    userId,
    apiKeyId,
    walletId,
    reservedAmount,
    resolvedModel,
    inputTokens,
    outputTokens,
    requestMeta,
  } = params;

  const result = await settleUsage({
    userId,
    apiKeyId,
    walletId,
    reservedAmount,
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
    totalCost: result.actualCost,
    remainingBalance: result.finalBalance,
  };

  return { ok: true, billing, refunded: result.refunded };
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

/**
 * Minimum balance that must remain after a reservation for the request to
 * proceed. Acts as a safety buffer against zero-balance edge cases. In IDR.
 */
export const MINIMUM_RESERVE_BALANCE = 100; // Rp100

/**
 * Estimate the MAXIMUM possible cost of a request for credit reservation.
 *
 * Unlike {@link estimateMinimumCost} (which caps output at 512 tokens for a
 * quick reject), this uses the full `max_output_tokens` (or a generous
 * default of 4096 when unspecified) so the reservation holds enough credit
 * to cover the realistic worst case. This prevents the scenario where the
 * pre-flight check passes but the actual charge fails after the provider
 * has already generated tokens.
 *
 * Returns cost in IDR.
 */
export function estimateMaxCost(params: {
  resolvedModel: ResolvedModel;
  promptTokens: number;
  maxOutputTokens: number;
}): number {
  const { resolvedModel, promptTokens, maxOutputTokens } = params;
  // When the client doesn't specify max_tokens, the model could generate a
  // lot. Default to 4096 (covers the vast majority of chat completions)
  // and cap at 8192 to avoid blocking users with healthy balances.
  const effectiveMaxOutput = Math.min(Math.max(maxOutputTokens, 256), 8192);
  const inputCost = (promptTokens / 1_000_000) * resolvedModel.inputPricePerMillion;
  const outputCost = (effectiveMaxOutput / 1_000_000) * resolvedModel.outputPricePerMillion;
  const total = inputCost + outputCost;
  // Enforce a minimum reservation so near-zero estimates still hold credits.
  return Math.max(total, MINIMUM_RESERVE_BALANCE);
}

export async function ensureWallet(userId: string) {
  return getOrCreateWallet(userId);
}

export function errorResponse(
  message: string,
  status: number,
  type = "invalid_request_error",
  code: string | null = null,
) {
  return Response.json(
    {
      error: {
        message,
        type,
        param: null,
        code,
      },
    },
    { status },
  );
}

/**
 * Map an upstream provider error into a generic, provider-agnostic client
 * response. The raw upstream body (which may name the real provider or leak
 * its internal billing/quota state) must NEVER be forwarded to the client —
 * callers should keep the original text in server logs only. Returns the
 * sanitized message plus a safe HTTP status to emit to the client.
 */
export function sanitizeUpstreamError(status: number): { message: string; status: number } {
  switch (status) {
    case 400:
      return { message: "Permintaan tidak valid. Periksa parameter request Anda.", status: 400 };
    case 401:
    case 403:
    case 402:
      // 402/401/403 from upstream indicate upstream-side billing/auth trouble.
      // Mask as a generic temporary outage so the client never infers that the
      // upstream account is out of credit or which provider is behind the gateway.
      return { message: "Layanan sementara tidak tersedia. Silakan coba lagi nanti.", status: 503 };
    case 408:
      return { message: "Permintaan melebihi batas waktu. Silakan coba lagi.", status: 504 };
    case 429:
      return { message: "Terlalu banyak permintaan. Silakan coba lagi sebentar.", status: 429 };
    default:
      if (status >= 500) {
        return { message: "Layanan sementara tidak tersedia. Silakan coba lagi nanti.", status: 502 };
      }
      return { message: "Gagal memproses permintaan. Silakan coba lagi.", status: 502 };
  }
}
