import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  resolveMasterModel,
  ensureWallet,
  estimatePromptTokens,
  estimateMaxCost,
  estimateMinimumCost,
  settleReservation,
  logNonBilledUsage,
  reserveCredits,
  releaseReservation,
  isModelAllowed,
  getClientIp,
  errorResponse,
  sanitizeUpstreamError,
  fetchUpstream,
  aggregateUpstreamStream,
  UPSTREAM_RETRY_BACKOFF_MS,
  sleep,
  type RequestMeta,
} from "@/app/lib/proxy-utils";
import { MASTER_API_URL, MASTER_API_KEY } from "@/app/lib/constants";
import {
  getActiveMasterKeyForRequest,
  markKeyError,
  markKeySuccess,
  countEnabledMasterKeys,
} from "@/app/lib/master-api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "/api/dashboard/chat";

function corsHeaders() {
  return {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/**
 * Internal chat endpoint for the dashboard Chat Playground.
 *
 * Authenticates via the NextAuth session (cookie), NOT a Bearer API key. The
 * server picks the user's active API key and uses it to proxy the request
 * upstream. This means the browser never needs the plaintext key — user-
 * generated keys (which store only a hash) work here.
 */
export async function POST(request: Request) {
  const startedAt = Date.now();
  const clientIp = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  const buildMeta = (statusCode: number): RequestMeta => ({
    endpoint: ENDPOINT,
    method: "POST",
    responseTime: Date.now() - startedAt,
    statusCode,
    clientIp,
    userAgent,
  });

  // 1. Session authentication
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return errorResponse("Unauthorized", 401, "authentication_error");
  }

  // 2. Find the user's active API key (server-side key selection)
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      userId,
      isActive: true,
      enabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!apiKey) {
    return errorResponse(
      "No active API key found. Generate one in the API Keys page.",
      403,
      "no_api_key",
    );
  }

  // Resolve master key from DB (with env fallback)
  const enabledKeyCount = await countEnabledMasterKeys();
  const usingEnvFallback = enabledKeyCount === 0 && !!MASTER_API_KEY;
  if (enabledKeyCount === 0 && !MASTER_API_KEY) {
    return errorResponse(
      "API key not fully activated (no master key available)",
      403,
      "configuration_error",
    );
  }

  // 3. Parse body
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const model = typeof body.model === "string" ? body.model : "";
  if (!model) {
    return errorResponse("Model is required", 400);
  }

  // 4. Resolve & validate model
  const resolvedModel = await resolveMasterModel(model);
  if (!resolvedModel) {
    return errorResponse(`Model '${model}' not supported`, 400, "invalid_request_error");
  }
  if (!resolvedModel.enabled) {
    return errorResponse(`Model '${model}' is currently disabled`, 403, "model_disabled");
  }
  if (resolvedModel.maintenanceMode) {
    return errorResponse(
      `Model '${model}' is temporarily in maintenance mode. Please try again later.`,
      503,
      "model_maintenance",
    );
  }
  if (!isModelAllowed(apiKey, resolvedModel)) {
    await logNonBilledUsage({
      userId,
      apiKeyId: apiKey.id,
      aiModelId: resolvedModel.id,
      modelLabel: resolvedModel.modelId,
      provider: resolvedModel.provider,
      status: "rejected",
      requestMeta: buildMeta(403),
    });
    return errorResponse(`Model '${model}' is not allowed for this API key`, 403, "model_not_allowed");
  }

  // 5. Load wallet
  const wallet = await ensureWallet(userId);
  const balance = Number(wallet.balance);
  console.log(`[api/dashboard/chat] wallet loaded, balance: ${balance} IDR`);

  if (balance <= 0) {
    console.log("[api/dashboard/chat] insufficient balance (zero):", balance);
    await logNonBilledUsage({
      userId,
      apiKeyId: apiKey.id,
      aiModelId: resolvedModel.id,
      modelLabel: resolvedModel.modelId,
      provider: resolvedModel.provider,
      status: "rejected",
      requestMeta: buildMeta(402),
    });
    return errorResponse(
      "Insufficient credit balance.",
      402,
      "billing_error",
      "insufficient_balance",
    );
  }

  // 6. Estimate costs
  const promptTokens = estimatePromptTokens(body.messages);
  const maxOutputTokens =
    typeof body.max_tokens === "number"
      ? body.max_tokens
      : typeof body.max_completion_tokens === "number"
        ? (body.max_completion_tokens as number)
        : 256;

  const minCost = estimateMinimumCost({ resolvedModel, promptTokens, maxOutputTokens });
  if (balance < minCost) {
    console.log(`[api/dashboard/chat] insufficient balance for minimum estimate: bal=${balance} min=${minCost}`);
    await logNonBilledUsage({
      userId,
      apiKeyId: apiKey.id,
      aiModelId: resolvedModel.id,
      modelLabel: resolvedModel.modelId,
      provider: resolvedModel.provider,
      status: "rejected",
      requestMeta: buildMeta(402),
    });
    return errorResponse(
      "Insufficient credit balance.",
      402,
      "billing_error",
      "insufficient_balance",
    );
  }

  // 7. Reserve credits (atomic deduction before contacting provider)
  const maxCost = estimateMaxCost({ resolvedModel, promptTokens, maxOutputTokens });
  console.log(`[api/dashboard/chat] estimated required balance: ${maxCost} IDR (current: ${balance} IDR)`);

  const reservation = await reserveCredits({
    userId,
    amount: maxCost,
    description: `Reservation: ${resolvedModel.modelId}`,
  });

  if (!reservation.ok) {
    console.log(`[api/dashboard/chat] reservation failed: ${reservation.error}, current balance: ${reservation.currentBalance} IDR`);
    console.log("[api/dashboard/chat] provider request BLOCKED — insufficient balance for reservation");
    await logNonBilledUsage({
      userId,
      apiKeyId: apiKey.id,
      aiModelId: resolvedModel.id,
      modelLabel: resolvedModel.modelId,
      provider: resolvedModel.provider,
      status: "rejected",
      requestMeta: buildMeta(402),
    });
    return errorResponse(
      "Insufficient credit balance.",
      402,
      "billing_error",
      "insufficient_balance",
    );
  }

  console.log(`[api/dashboard/chat] reservation successful: reserved ${reservation.reservedAmount} IDR, new balance: ${reservation.newBalance} IDR`);
  console.log("[api/dashboard/chat] provider request ALLOWED");

  // 8. Forward to upstream provider
  body.model = resolvedModel.masterId;
  const upstreamUrl = `${MASTER_API_URL}/chat/completions`;

  // Kimi K3 is a reasoning model that rejects `temperature` with HTTP 400.
  // Strip it before forwarding so clients that always send temperature don't
  // get a generic "Permintaan tidak valid" error.
  if (resolvedModel.masterId === "kimi-k3" && "temperature" in body) {
    delete body.temperature;
    console.log("[api/dashboard/chat] stripped temperature for kimi-k3 (reasoning model)");
  }

  // WORKAROUND: the upstream origin currently crashes (Cloudflare 520) on
  // NON-streaming chat completions — verified across all models — while
  // streaming works fine. Always request a stream upstream and aggregate
  // the chunks back into a standard non-streaming JSON response for the
  // playground browser client (which expects a single JSON body).
  body.stream = true;
  const existingStreamOptions = body.stream_options;
  body.stream_options = {
    ...(typeof existingStreamOptions === "object" && existingStreamOptions !== null
      ? existingStreamOptions
      : {}),
    include_usage: true,
  };

  const MAX_ATTEMPTS = usingEnvFallback ? 1 : 3;
  let lastUpstreamStatus = 502;
  let lastUpstreamText = "";

  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let currentKey: { id: string; plaintext: string };
      if (usingEnvFallback) {
        currentKey = { id: "env-fallback", plaintext: MASTER_API_KEY };
      } else {
        const next = await getActiveMasterKeyForRequest();
        if (!next) break;
        currentKey = next;
      }

      const upstream = await fetchUpstream(upstreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentKey.plaintext}`,
        },
        body: JSON.stringify(body),
      });

      // Same policy as /v1/chat/completions: 401/403/429 mark the key errored
      // (cooldown + rotate to another key), but 5xx is an origin SERVER
      // problem — don't cooldown the key, or a single upstream blip turns
      // into a full 60s outage for every request.
      const isKeyError =
        upstream.status === 401 ||
        upstream.status === 403 ||
        upstream.status === 429;
      const isRetryable = !usingEnvFallback && (isKeyError || upstream.status >= 500);

      if (isRetryable) {
        const text = await upstream.text().catch(() => "");
        if (isKeyError) {
          console.error(`[api/dashboard/chat] upstream key error: ${upstream.status}, marking key errored`);
          await markKeyError(currentKey.id, upstream.status, text.slice(0, 500));
        } else {
          console.error(`[api/dashboard/chat] upstream server error (retryable): ${upstream.status}, key kept active (origin issue, no cooldown)`);
        }
        lastUpstreamStatus = upstream.status;
        lastUpstreamText = text;
        // Brief backoff before the next attempt (don't hammer a struggling origin).
        if (attempt + 1 < MAX_ATTEMPTS) {
          await sleep(
            UPSTREAM_RETRY_BACKOFF_MS[
              Math.min(attempt, UPSTREAM_RETRY_BACKOFF_MS.length - 1)
            ],
          );
        }
        continue;
      }

      if (!upstream.ok) {
        const text = await upstream.text().catch(() => "");
        console.error("[api/dashboard/chat] upstream error:", upstream.status, text.slice(0, 500));

        await releaseReservation({
          walletId: reservation.walletId,
          reservedAmount: reservation.reservedAmount,
          description: resolvedModel.modelId,
        });

        await logNonBilledUsage({
          userId,
          apiKeyId: apiKey.id,
          aiModelId: resolvedModel.id,
          modelLabel: resolvedModel.modelId,
          provider: resolvedModel.provider,
          status: "error",
          requestMeta: buildMeta(upstream.status),
        });
        // Sanitize: never forward the upstream body to the client — it may
        // name the real provider or leak upstream billing/quota state.
        const safe = sanitizeUpstreamError(upstream.status);
        return errorResponse(safe.message, safe.status, "api_error");
      }

      if (!usingEnvFallback) {
        await markKeySuccess(currentKey.id);
      }

      const data = await aggregateUpstreamStream(upstream);
      if (!data) {
        console.error("[api/dashboard/chat] failed to aggregate upstream stream");

        // Release reservation — no valid response to bill
        await releaseReservation({
          walletId: reservation.walletId,
          reservedAmount: reservation.reservedAmount,
          description: resolvedModel.modelId,
        });
        console.log("[api/dashboard/chat] reservation released (invalid upstream stream)");

        await logNonBilledUsage({
          userId,
          apiKeyId: apiKey.id,
          aiModelId: resolvedModel.id,
          modelLabel: resolvedModel.modelId,
          provider: resolvedModel.provider,
          status: "error",
          requestMeta: buildMeta(502),
        });
        return errorResponse("Upstream returned an invalid response", 502, "api_error");
      }

      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;

      // 9. Settle the reservation against actual usage
      const settleResult = await settleReservation({
        userId,
        apiKeyId: apiKey.id,
        walletId: reservation.walletId,
        reservedAmount: reservation.reservedAmount,
        resolvedModel,
        inputTokens,
        outputTokens,
        requestMeta: buildMeta(200),
      });

      if (!settleResult.ok) {
        console.error("[api/dashboard/chat] settlement failed:", settleResult.error);
        await logNonBilledUsage({
          userId,
          apiKeyId: apiKey.id,
          aiModelId: resolvedModel.id,
          modelLabel: resolvedModel.modelId,
          provider: resolvedModel.provider,
          status: "error",
          requestMeta: buildMeta(200),
        });
      } else {
        console.log(`[api/dashboard/chat] final billing: cost=${settleResult.billing.totalCost} IDR, refund=${settleResult.refunded ?? 0} IDR, balance=${settleResult.billing.remainingBalance} IDR`);
      }

      if (settleResult.ok) {
        (data as Record<string, unknown>).x_billing = settleResult.billing;
      }

      return Response.json(data, { headers: corsHeaders() });
    }

    // All attempts exhausted
    console.error(`[api/dashboard/chat] all ${MAX_ATTEMPTS} attempts failed, last status: ${lastUpstreamStatus}, last body: ${lastUpstreamText.slice(0, 500)}`);
    await releaseReservation({
      walletId: reservation.walletId,
      reservedAmount: reservation.reservedAmount,
      description: resolvedModel.modelId,
    });

    await logNonBilledUsage({
      userId,
      apiKeyId: apiKey.id,
      aiModelId: resolvedModel.id,
      modelLabel: resolvedModel.modelId,
      provider: resolvedModel.provider,
      status: "error",
      requestMeta: buildMeta(lastUpstreamStatus),
    });
    // Sanitize: never forward upstream body to the client.
    const safe = sanitizeUpstreamError(lastUpstreamStatus);
    return errorResponse(safe.message, safe.status, "api_error");
  } catch (e) {
    console.error("[api/dashboard/chat] proxy error:", e);

    // Release reservation on network/transport error
    await releaseReservation({
      walletId: reservation.walletId,
      reservedAmount: reservation.reservedAmount,
      description: resolvedModel.modelId,
    });
    console.log("[api/dashboard/chat] reservation released (proxy error)");

    await logNonBilledUsage({
      userId,
      apiKeyId: apiKey.id,
      aiModelId: resolvedModel.id,
      modelLabel: resolvedModel.modelId,
      provider: resolvedModel.provider,
      status: "error",
      requestMeta: buildMeta(502),
    });
    return errorResponse("Failed to reach upstream API", 502, "api_error");
  }
}
