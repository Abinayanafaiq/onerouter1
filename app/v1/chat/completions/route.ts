import {
  authenticateRequest,
  resolveMasterModel,
  settleReservation,
  ensureWallet,
  estimatePromptTokens,
  estimateMaxCost,
  estimateMinimumCost,
  logNonBilledUsage,
  reserveCredits,
  releaseReservation,
  isModelAllowed,
  getClientIp,
  errorResponse,
  type BillingInfo,
  type RequestMeta,
} from "@/app/lib/proxy-utils";
import { checkRateLimit, checkUserRateLimit } from "@/app/lib/rate-limit";
import { MASTER_API_URL, MASTER_API_KEY } from "@/app/lib/constants";
import {
  getActiveMasterKeyForRequest,
  markKeyError,
  markKeySuccess,
  countEnabledMasterKeys,
  maskForKeyLog,
} from "@/app/lib/master-api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "/v1/chat/completions";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

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

  console.log("[v1/chat] request received");

  // 1. Authenticate API Key
  const apiKey = await authenticateRequest(request.headers.get("authorization"), { clientIp });
  if (!apiKey) {
    console.log("[v1/chat] auth failed - invalid key");
    return errorResponse("Invalid API key or key expired", 401, "authentication_error");
  }
  console.log("[v1/chat] auth ok, keyId:", apiKey.id);
  if (apiKey.billingMode === "TOKEN_PACKAGE") {
    return errorResponse(
      "API key paket hanya dapat digunakan melalui /v1/package/chat/completions.",
      403,
      "invalid_api_key_mode",
      "package_endpoint_required",
    );
  }

  // 2. Rate limit (per API key)
  const keyRateLimit = checkRateLimit(apiKey.id, apiKey.rateLimit);
  if (!keyRateLimit.allowed) {
    console.log("[v1/chat] rate limited (key)");
    return Response.json(
      { error: { message: "Rate limit exceeded. Too many requests.", type: "rate_limit_error", param: null, code: "rate_limit_exceeded" } },
      {
        status: 429,
        headers: {
          "Retry-After": String(keyRateLimit.retryAfter),
          "X-RateLimit-Limit": String(keyRateLimit.limit),
          "X-RateLimit-Remaining": "0",
          ...corsHeaders(),
        },
      },
    );
  }

  // 2b. Rate limit (per user) — strictest wins; identical 429 shape, no leak of which limit
  const userRateLimit = checkUserRateLimit(apiKey.userId, apiKey.user.rateLimit);
  if (!userRateLimit.allowed) {
    console.log("[v1/chat] rate limited (user)");
    return Response.json(
      { error: { message: "Rate limit exceeded. Too many requests.", type: "rate_limit_error", param: null, code: "rate_limit_exceeded" } },
      {
        status: 429,
        headers: {
          "Retry-After": String(userRateLimit.retryAfter),
          "X-RateLimit-Limit": String(userRateLimit.limit),
          "X-RateLimit-Remaining": "0",
          ...corsHeaders(),
        },
      },
    );
  }

  // 3. Parse body
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    console.log("[v1/chat] invalid JSON body");
    return errorResponse("Invalid JSON body", 400);
  }

  const model = typeof body.model === "string" ? body.model : "";
  if (!model) {
    console.log("[v1/chat] no model specified");
    return errorResponse("Model is required", 400);
  }
  console.log("[v1/chat] model:", model);

  // 4. Resolve & validate model
  const resolvedModel = await resolveMasterModel(model);
  if (!resolvedModel) {
    console.log("[v1/chat] model not supported:", model);
    return errorResponse(`Model '${model}' not supported`, 400, "invalid_request_error");
  }
  console.log("[v1/chat] resolved master model:", resolvedModel.masterId);

  if (!resolvedModel.enabled) {
    console.log("[v1/chat] model disabled:", model);
    return errorResponse(`Model '${model}' is currently disabled`, 403, "model_disabled");
  }

  if (resolvedModel.maintenanceMode) {
    console.log("[v1/chat] model in maintenance:", model);
    return errorResponse(
      `Model '${model}' is temporarily in maintenance mode. Please try again later.`,
      503,
      "model_maintenance",
    );
  }

  // 5. Enforce per-key allowed-models restriction
  if (!isModelAllowed(apiKey, resolvedModel)) {
    console.log("[v1/chat] model not allowed for key:", model);
    await logNonBilledUsage({
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      aiModelId: resolvedModel.id,
      modelLabel: resolvedModel.modelId,
      provider: resolvedModel.provider,
      status: "rejected",
      requestMeta: buildMeta(403),
    });
    return errorResponse(`Model '${model}' is not allowed for this API key`, 403, "model_not_allowed");
  }

  // 5b. Resolve master key from DB (with env fallback when zero DB keys)
  const enabledKeyCount = await countEnabledMasterKeys();
  const usingEnvFallback = enabledKeyCount === 0 && !!MASTER_API_KEY;
  if (usingEnvFallback) {
    console.warn("[v1/chat] WARNING: using MASTER_API_KEY env fallback (no DB master keys configured)");
  }
  if (enabledKeyCount === 0 && !MASTER_API_KEY) {
    console.log("[v1/chat] no master key available (DB empty, env unset)");
    return errorResponse("API key not fully activated (no master key available)", 403, "configuration_error");
  }

  // 6. Load wallet
  const wallet = await ensureWallet(apiKey.userId);
  const balance = Number(wallet.balance);
  console.log(`[v1/chat] wallet loaded, balance: ${balance} IDR`);

  if (balance <= 0) {
    console.log("[v1/chat] insufficient balance (zero):", balance);
    await logNonBilledUsage({
      userId: apiKey.userId,
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

  // 7. Estimate costs
  const promptTokens = estimatePromptTokens(body.messages);
  const maxOutputTokens =
    typeof body.max_tokens === "number"
      ? body.max_tokens
      : typeof body.max_completion_tokens === "number"
        ? (body.max_completion_tokens as number)
        : 256;

  // Quick reject if balance can't even cover the minimum estimate
  const minCost = estimateMinimumCost({ resolvedModel, promptTokens, maxOutputTokens });
  if (balance < minCost) {
    console.log(`[v1/chat] insufficient balance for minimum estimate: bal=${balance} min=${minCost}`);
    await logNonBilledUsage({
      userId: apiKey.userId,
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

  // 8. Reserve credits (atomic deduction before contacting provider)
  const maxCost = estimateMaxCost({ resolvedModel, promptTokens, maxOutputTokens });
  console.log(`[v1/chat] estimated required balance: ${maxCost} IDR (current: ${balance} IDR)`);

  const reservation = await reserveCredits({
    userId: apiKey.userId,
    amount: maxCost,
    description: `Reservation: ${resolvedModel.modelId}`,
  });

  if (!reservation.ok) {
    console.log(`[v1/chat] reservation failed: ${reservation.error}, current balance: ${reservation.currentBalance} IDR`);
    console.log("[v1/chat] provider request BLOCKED — insufficient balance for reservation");
    await logNonBilledUsage({
      userId: apiKey.userId,
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

  console.log(`[v1/chat] reservation successful: reserved ${reservation.reservedAmount} IDR, new balance: ${reservation.newBalance} IDR`);
  console.log("[v1/chat] provider request ALLOWED");

  // 9. Forward to upstream provider with failover
  body.model = resolvedModel.masterId;
  const isStream = body.stream === true;
  const upstreamUrl = `${MASTER_API_URL}/chat/completions`;
  console.log("[v1/chat] forwarding to:", upstreamUrl, "stream:", isStream);

  // Inject stream_options.include_usage so the upstream sends a usage chunk
  // at the end of the SSE stream. Without this, most OpenAI-compatible
  // providers (incl. limitrouter) never emit a `usage` field in streaming
  // mode, leaving prompt/completion tokens at 0 and triggering a full
  // refund to the user — while the operator is still charged upstream.
  let streamOptionsInjected = false;
  if (isStream) {
    const existing = body.stream_options;
    body.stream_options = {
      ...(typeof existing === "object" && existing !== null ? existing : {}),
      include_usage: true,
    };
    streamOptionsInjected = true;
    console.log("[v1/chat] injected stream_options.include_usage=true");
  }

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
        if (!next) {
          console.log("[v1/chat] no more usable master keys");
          break;
        }
        currentKey = next;
      }

      const maskedLog = usingEnvFallback ? "env-fallback" : maskForKeyLog(currentKey.plaintext);
      console.log(`[v1/chat] attempt ${attempt + 1}/${MAX_ATTEMPTS} with key ${maskedLog}`);

      let upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentKey.plaintext}`,
        },
        body: JSON.stringify(body),
      });

      console.log("[v1/chat] upstream status:", upstream.status);

      // Fallback: if the upstream rejects the injected stream_options
      // (e.g. provider doesn't support include_usage and returns 400),
      // strip it and retry once on the SAME key. This is a request-shape
      // issue, not a key issue — don't burn a failover attempt for it.
      // Only trigger when the 400 is specifically about stream_options;
      // unrelated 400s (e.g. unsupported_content) must not waste a retry.
      if (upstream.status === 400 && streamOptionsInjected) {
        const probe = await upstream.text().catch(() => "");
        const probeLower = probe.toLowerCase();
        const isStreamOptionsError =
          probeLower.includes("stream_options") ||
          probeLower.includes("include_usage") ||
          probeLower.includes("stream_option");
        if (isStreamOptionsError) {
          console.warn(
            `[v1/chat] 400 stream_options rejected (key ${maskedLog}); stripping & retrying on same key. probe=${probe.slice(0, 200)}`,
          );
          delete body.stream_options;
          streamOptionsInjected = false;
          upstream = await fetch(upstreamUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentKey.plaintext}`,
            },
            body: JSON.stringify(body),
          });
          console.log("[v1/chat] retry without stream_options, status:", upstream.status);
        } else {
          // Unrelated 400 — re-wrap so the non-retryable handler below can
          // still read the body (we already consumed it via .text() above).
          console.log(
            `[v1/chat] 400 unrelated to stream_options (probe=${probe.slice(0, 200)}); skipping fallback`,
          );
          upstream = new Response(probe, {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      const isRetryable = !usingEnvFallback && (
        upstream.status === 401 ||
        upstream.status === 403 ||
        upstream.status === 429 ||
        upstream.status >= 500
      );

      if (isRetryable) {
        const text = await upstream.text().catch(() => "");
        console.error(`[v1/chat] upstream error (retryable): ${upstream.status}, marking key ${maskedLog} errored`);
        await markKeyError(currentKey.id, upstream.status, text.slice(0, 500));
        lastUpstreamStatus = upstream.status;
        lastUpstreamText = text;
        continue;
      }

      if (!upstream.ok) {
        const text = await upstream.text().catch(() => "");
        console.error("[v1/chat] upstream error (non-retryable):", upstream.status, text.slice(0, 500));

        await releaseReservation({
          walletId: reservation.walletId,
          reservedAmount: reservation.reservedAmount,
          description: resolvedModel.modelId,
        });
        console.log("[v1/chat] reservation released (upstream error)");

        await logNonBilledUsage({
          userId: apiKey.userId,
          apiKeyId: apiKey.id,
          aiModelId: resolvedModel.id,
          modelLabel: resolvedModel.modelId,
          provider: resolvedModel.provider,
          status: "error",
          requestMeta: buildMeta(upstream.status),
        });
        return errorResponse(
          `Upstream error: ${upstream.status} ${text.slice(0, 500)}`,
          upstream.status,
          "api_error",
        );
      }

      if (!usingEnvFallback) {
        await markKeySuccess(currentKey.id);
      }

      // --- Streaming response ---
      if (isStream && upstream.body) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = upstream.body.getReader();
        let streamPromptTokens = 0;
        let streamCompletionTokens = 0;
        let buffer = "";

        const stream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;
                    try {
                      const parsed = JSON.parse(data) as {
                        usage?: { prompt_tokens?: number; completion_tokens?: number };
                      };
                      if (parsed.usage) {
                        streamPromptTokens = parsed.usage.prompt_tokens || 0;
                        streamCompletionTokens = parsed.usage.completion_tokens || 0;
                      }
                    } catch (e) {
                      // skip non-JSON chunks, but log so malformed SSE is visible
                      console.warn(
                        "[v1/chat] malformed SSE chunk skipped:",
                        data.slice(0, 200),
                        e instanceof Error ? e.message : e,
                      );
                    }
                  }
                  controller.enqueue(encoder.encode(line + "\n"));
                }
              }
              if (buffer) controller.enqueue(encoder.encode(buffer));
            } finally {
              // Settle the reservation against actual usage
              if (streamPromptTokens === 0 && streamCompletionTokens === 0) {
                console.warn(
                  `[v1/chat LEAK SUSPECT] settle 0/0 tokens after ${Date.now() - startedAt}ms — operator may be charged by upstream without user billing`,
                );
              }
              const settleResult = await settleReservation({
                userId: apiKey.userId,
                apiKeyId: apiKey.id,
                walletId: reservation.walletId,
                reservedAmount: reservation.reservedAmount,
                resolvedModel,
                inputTokens: streamPromptTokens,
                outputTokens: streamCompletionTokens,
                requestMeta: buildMeta(200),
              });

              if (settleResult.ok) {
                console.log(`[v1/chat] final billing: cost=${settleResult.billing.totalCost} IDR, refund=${settleResult.refunded ?? 0} IDR, balance=${settleResult.billing.remainingBalance} IDR`);
                const billingComment = `: x_billing ${JSON.stringify(settleResult.billing)}\n`;
                controller.enqueue(encoder.encode(billingComment));
              } else {
                console.error("[v1/chat] settlement failed:", settleResult.error);
              }

              try {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              } catch {
                // Controller may already be closed or errored.
              }
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            ...corsHeaders(),
          },
        });
      }

      // --- Non-streaming response ---
      const rawText = await upstream.text();
      let data: { usage?: { prompt_tokens?: number; completion_tokens?: number } };
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error("[v1/chat] JSON parse failed. Raw (first 500):", rawText.slice(0, 500));

        // Release reservation — no valid response to bill
        await releaseReservation({
          walletId: reservation.walletId,
          reservedAmount: reservation.reservedAmount,
          description: resolvedModel.modelId,
        });
        console.log("[v1/chat] reservation released (non-JSON response)");

        await logNonBilledUsage({
          userId: apiKey.userId,
          apiKeyId: apiKey.id,
          aiModelId: resolvedModel.id,
          modelLabel: resolvedModel.modelId,
          provider: resolvedModel.provider,
          status: "error",
          requestMeta: buildMeta(502),
        });
        return errorResponse("Upstream returned a non-JSON response", 502, "api_error");
      }

      const promptTokensResp = data.usage?.prompt_tokens || 0;
      const completionTokensResp = data.usage?.completion_tokens || 0;

      // Settle the reservation against actual usage
      if (promptTokensResp === 0 && completionTokensResp === 0) {
        console.warn(
          `[v1/chat LEAK SUSPECT] non-stream settle 0/0 tokens after ${Date.now() - startedAt}ms — operator may be charged by upstream without user billing`,
        );
      }
      const settleResult = await settleReservation({
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        walletId: reservation.walletId,
        reservedAmount: reservation.reservedAmount,
        resolvedModel,
        inputTokens: promptTokensResp,
        outputTokens: completionTokensResp,
        requestMeta: buildMeta(200),
      });

      if (!settleResult.ok) {
        console.error("[v1/chat] settlement failed:", settleResult.error);
        await logNonBilledUsage({
          userId: apiKey.userId,
          apiKeyId: apiKey.id,
          aiModelId: resolvedModel.id,
          modelLabel: resolvedModel.modelId,
          provider: resolvedModel.provider,
          status: "error",
          requestMeta: buildMeta(200),
        });
      } else {
        console.log(`[v1/chat] final billing: cost=${settleResult.billing.totalCost} IDR, refund=${settleResult.refunded ?? 0} IDR, balance=${settleResult.billing.remainingBalance} IDR`);
      }

      // Attach billing info to response (custom field, OpenAI SDK ignores unknown fields)
      if (settleResult.ok) {
        (data as Record<string, unknown>).x_billing = settleResult.billing;
      }

      return Response.json(data, { headers: corsHeaders() });
    }

    // All attempts exhausted
    console.error(`[v1/chat] all ${MAX_ATTEMPTS} attempts failed, last status: ${lastUpstreamStatus}`);
    await releaseReservation({
      walletId: reservation.walletId,
      reservedAmount: reservation.reservedAmount,
      description: resolvedModel.modelId,
    });
    console.log("[v1/chat] reservation released (all attempts failed)");

    await logNonBilledUsage({
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      aiModelId: resolvedModel.id,
      modelLabel: resolvedModel.modelId,
      provider: resolvedModel.provider,
      status: "error",
      requestMeta: buildMeta(lastUpstreamStatus),
    });
    return errorResponse(
      `Upstream error: ${lastUpstreamStatus} ${lastUpstreamText.slice(0, 500)}`,
      lastUpstreamStatus,
      "api_error",
    );
  } catch (e) {
    console.error("[v1/chat/completions] proxy error:", e);

    // Release reservation on network/transport error
    await releaseReservation({
      walletId: reservation.walletId,
      reservedAmount: reservation.reservedAmount,
      description: resolvedModel.modelId,
    });
    console.log("[v1/chat] reservation released (proxy error)");

    await logNonBilledUsage({
      userId: apiKey.userId,
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

export type { BillingInfo };
