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
  param: string | null = null,
) {
  return Response.json(
    {
      error: {
        message,
        type,
        param,
        code,
      },
    },
    { status },
  );
}

// DeepSeek V4.1 only accepts reasoning_effort low | high | xhigh | max | none
// (or an integer 1-100) and answers HTTP 400 to the OpenAI-standard "medium"
// and "minimal" that many clients send by default.
const DEEPSEEK_V41_EFFORT_MAP = new Map([
  ["minimal", "low"],
  ["medium", "high"],
]);

/**
 * Map an unsupported `reasoning_effort` onto the nearest value the target
 * model accepts, in place, before the body is forwarded upstream. `modelIds`
 * are the public/upstream IDs of the resolved model. Returns the applied
 * mapping (for logging) or null when the body was left untouched.
 */
export function normalizeReasoningEffort(
  body: Record<string, unknown>,
  modelIds: string[],
): { from: string; to: string } | null {
  if (!modelIds.some((id) => /deepseek-v4\.1/i.test(id))) return null;
  const effort = body.reasoning_effort;
  if (typeof effort !== "string") return null;
  const mapped = DEEPSEEK_V41_EFFORT_MAP.get(effort.toLowerCase());
  if (!mapped) return null;
  body.reasoning_effort = mapped;
  return { from: effort, to: mapped };
}

/**
 * Collapse `reasoning` into `reasoning_content` on each message, in place.
 * Clients (and our own aggregated non-stream response) can echo an assistant
 * turn carrying both fields; the upstream deserializer treats `reasoning` as
 * an alias of `reasoning_content` and answers HTTP 400 "duplicate field
 * `reasoning_content`". Returns how many messages were changed (for logging).
 */
export function dedupeReasoningFields(body: Record<string, unknown>): number {
  if (!Array.isArray(body.messages)) return 0;
  let changed = 0;
  for (const m of body.messages) {
    if (!isPlainObject(m) || !("reasoning" in m) || !("reasoning_content" in m)) continue;
    const content = m.reasoning_content;
    if ((typeof content !== "string" || content === "") && typeof m.reasoning === "string") {
      m.reasoning_content = m.reasoning;
    }
    delete m.reasoning;
    changed++;
  }
  return changed;
}

function parsesAsObject(text: string): boolean {
  try {
    return isPlainObject(JSON.parse(text));
  } catch {
    return false;
  }
}

/**
 * Best-effort completion of a truncated JSON object: close an open string,
 * drop a trailing comma/colon, then close every open bracket. When the cut
 * lands on a dangling key, retry from the last comma so the complete
 * key/value pairs before it survive. Returns null when nothing parses.
 */
function repairTruncatedJsonObject(text: string): string | null {
  const close = (src: string): string => {
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    for (const ch of src) {
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    let out = src;
    if (inString) out += (escaped ? "\\" : "") + '"';
    out = out.replace(/[\s,:]+$/, "");
    return out + stack.reverse().join("");
  };

  let candidate = text.trim();
  if (!candidate.startsWith("{")) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const closed = close(candidate);
    if (parsesAsObject(closed)) return closed;
    const lastComma = candidate.lastIndexOf(",");
    if (lastComma <= 0) break;
    candidate = candidate.slice(0, lastComma);
  }
  return null;
}

/**
 * Make every `tool_calls[].function.arguments` in the history a valid JSON
 * object string, in place. A previous turn cut off mid tool call (max_tokens
 * or a dropped stream) leaves truncated arguments that clients echo back, and
 * the upstream then answers HTTP 400 "must be a valid JSON object string" on
 * every following request. Returns how many tool calls were fixed.
 */
export function repairToolCallArguments(body: Record<string, unknown>): number {
  if (!Array.isArray(body.messages)) return 0;
  let fixed = 0;
  for (const m of body.messages) {
    if (!isPlainObject(m) || !Array.isArray(m.tool_calls)) continue;
    for (const call of m.tool_calls) {
      if (!isPlainObject(call) || !isPlainObject(call.function)) continue;
      const fn = call.function;
      const args = fn.arguments;
      if (typeof args === "string" && parsesAsObject(args)) continue;
      if (isPlainObject(args)) {
        fn.arguments = JSON.stringify(args);
      } else {
        fn.arguments = (typeof args === "string" && repairTruncatedJsonObject(args)) || "{}";
      }
      fixed++;
    }
  }
  return fixed;
}

const IMAGE_DETAILS = new Set(["auto", "low", "high"]);

function imageUrlPart(url: unknown, detail?: unknown): Record<string, unknown> | null {
  if (typeof url !== "string" || url === "") return null;
  const image_url: Record<string, unknown> = { url };
  if (typeof detail === "string" && IMAGE_DETAILS.has(detail)) image_url.detail = detail;
  return { type: "image_url", image_url };
}

// Convert one user content part into the strict OpenAI shape (text /
// image_url / input_audio / file). Returns null when the part carries nothing
// that can be forwarded.
function normalizeUserContentPart(part: unknown): Record<string, unknown> | null {
  if (typeof part === "string") return { type: "text", text: part };
  if (!isPlainObject(part)) return null;
  switch (part.type) {
    case "text":
    case "input_text":
      return typeof part.text === "string" ? { type: "text", text: part.text } : null;
    case "image_url":
    case "input_image": {
      const src = part.image_url;
      if (typeof src === "string") return imageUrlPart(src, part.detail);
      if (isPlainObject(src)) return imageUrlPart(src.url, src.detail ?? part.detail);
      return null;
    }
    case "image": {
      // Anthropic style: { type: "image", source: { type: "base64", media_type, data } | { type: "url", url } }
      const source = part.source;
      if (!isPlainObject(source)) return null;
      if (source.type === "url") return imageUrlPart(source.url);
      if (typeof source.data !== "string") return null;
      const mediaType = typeof source.media_type === "string" ? source.media_type : "image/png";
      return imageUrlPart(`data:${mediaType};base64,${source.data}`);
    }
    case "input_audio":
      return isPlainObject(part.input_audio) ? { type: "input_audio", input_audio: part.input_audio } : null;
    case "file":
      return isPlainObject(part.file) ? { type: "file", file: part.file } : null;
    default:
      // Unknown part (tool_result, document, thinking, ...): keep any text it carries.
      if (typeof part.text === "string") return { type: "text", text: part.text };
      if (typeof part.content === "string") return { type: "text", text: part.content };
      return null;
  }
}

/**
 * Rewrite every user message `content` into a shape the upstream deserializer
 * accepts (a string or an array of OpenAI content parts), in place. Clients
 * send Anthropic/Responses-style parts (`image`, `input_text`, `input_image`),
 * `image_url` as a bare string, `null` content or a single part object; the
 * upstream answers each with HTTP 400 "data did not match any variant of
 * untagged enum ChatCompletionRequestUserMessageContent". Returns how many
 * messages were changed (for logging).
 */
export function normalizeUserMessageContent(body: Record<string, unknown>): number {
  if (!Array.isArray(body.messages)) return 0;
  let changed = 0;
  for (const m of body.messages) {
    if (!isPlainObject(m) || m.role !== "user" || typeof m.content === "string") continue;
    const before = JSON.stringify(m.content ?? null);
    const rawParts = Array.isArray(m.content) ? m.content : m.content == null ? [] : [m.content];
    const parts = rawParts
      .map(normalizeUserContentPart)
      .filter((p): p is Record<string, unknown> => p !== null);
    const next = parts.length === 0 ? "" : parts;
    if (JSON.stringify(next) === before) continue;
    m.content = next;
    changed++;
  }
  return changed;
}

// Phrases upstream providers use when the prompt (+ max_tokens) no longer fits
// the model's context window. Matched against the lowercased upstream body.
const CONTEXT_OVERFLOW_PATTERNS = [
  "context_length_exceeded",
  "context length",
  "context window",
  "context limit",
  "combined input and output tokens",
  "reduce the input length",
  "reduce the length of",
  "prompt is too long",
  "input is too long",
  "exceeds the maximum number of tokens",
];

function isContextOverflow(status: number, upstreamBody: string): boolean {
  if (status !== 400 && status !== 413 && status !== 422) return false;
  const lower = upstreamBody.toLowerCase();
  return CONTEXT_OVERFLOW_PATTERNS.some((p) => lower.includes(p));
}

// Build the client-facing overflow message. Only the token counts are lifted
// from the upstream body (they don't identify the provider); the rest of the
// upstream text is never forwarded.
function contextOverflowMessage(upstreamBody: string): string {
  const pick = (...patterns: RegExp[]): number | null => {
    for (const re of patterns) {
      const m = upstreamBody.match(re);
      if (m) return Number(m[1]);
    }
    return null;
  };
  const limit = pick(/at most (\d+)/i, /maximum context length is (\d+)/i, /> (\d+) maximum/i);
  const input = pick(/has (\d+) input tokens/i, /(\d+) in the messages/i, /too long: (\d+) tokens/i);
  const output = pick(/asks for (\d+) output tokens/i, /(\d+) in the completion/i);
  const fmt = (n: number) => n.toLocaleString("id-ID");
  const details = [
    limit !== null ? `maks ${fmt(limit)} token` : null,
    input !== null ? `input Anda ${fmt(input)} token` : null,
    output !== null ? `max_tokens ${fmt(output)}` : null,
  ].filter(Boolean);
  return (
    "Permintaan melebihi batas konteks model" +
    (details.length > 0 ? ` (${details.join(", ")})` : "") +
    ". Kurangi panjang input atau max_tokens."
  );
}

/**
 * Map an upstream provider error into a generic, provider-agnostic client
 * response. The raw upstream body (which may name the real provider or leak
 * its internal billing/quota state) must NEVER be forwarded to the client —
 * callers should keep the original text in server logs only. Returns the
 * sanitized message plus a safe HTTP status, error type and code to emit to
 * the client.
 *
 * `upstreamBody` is only inspected to recognise a context-window overflow, so
 * the client gets the OpenAI-compatible `context_length_exceeded` code (which
 * coding agents rely on to compact their history) instead of a generic 400,
 * and to name the parameter when `reasoning_effort` was rejected.
 */
export function sanitizeUpstreamError(
  status: number,
  upstreamBody = "",
): { message: string; status: number; type: string; code: string | null; param: string | null } {
  if (isContextOverflow(status, upstreamBody)) {
    return {
      message: contextOverflowMessage(upstreamBody),
      status: 400,
      type: "invalid_request_error",
      code: "context_length_exceeded",
      param: null,
    };
  }
  // Upstream rejected the reasoning_effort value. Name the parameter so the
  // client knows what to change; the accepted values differ per model, so the
  // upstream wording (which may name the real model) is not forwarded.
  if ((status === 400 || status === 422) && upstreamBody.includes("reasoning_effort")) {
    return {
      message:
        "Nilai reasoning_effort tidak didukung oleh model ini. Gunakan nilai lain (mis. low atau high) atau hapus parameter tersebut.",
      status: 400,
      type: "invalid_request_error",
      code: "unsupported_value",
      param: "reasoning_effort",
    };
  }
  return { ...sanitizeUpstreamStatus(status), type: "api_error", code: null, param: null };
}

function sanitizeUpstreamStatus(status: number): { message: string; status: number } {
  switch (status) {
    case 400:
      return { message: "Permintaan tidak valid. Periksa parameter request Anda.", status: 400 };
    case 413:
      return { message: "Ukuran permintaan terlalu besar. Kurangi panjang input Anda.", status: 413 };
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
