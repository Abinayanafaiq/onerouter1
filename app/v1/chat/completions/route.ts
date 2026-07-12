import {
  authenticateRequest,
  resolveMasterModel,
  recordUsageWithBilling,
  ensureWallet,
  estimatePromptTokens,
  estimateMinimumCost,
  logNonBilledUsage,
  isModelAllowed,
  getClientIp,
  errorResponse,
  type BillingInfo,
  type RequestMeta,
} from "@/app/lib/proxy-utils";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { MASTER_API_URL } from "@/app/lib/constants";

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

  const apiKey = await authenticateRequest(request.headers.get("authorization"), { clientIp });
  if (!apiKey) {
    console.log("[v1/chat] auth failed - invalid key");
    return errorResponse("Invalid API key or key expired", 401, "authentication_error");
  }
  console.log("[v1/chat] auth ok, keyId:", apiKey.id);

  const rateLimit = checkRateLimit(apiKey.id, apiKey.rateLimit);
  if (!rateLimit.allowed) {
    console.log("[v1/chat] rate limited");
    return Response.json(
      { error: { message: "Rate limit exceeded. Too many requests.", type: "rate_limit_error", param: null, code: "rate_limit_exceeded" } },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
          ...corsHeaders(),
        },
      },
    );
  }

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

  // Enforce per-key allowed-models restriction.
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

  if (!apiKey.masterApiKey) {
    console.log("[v1/chat] no master key bound");
    return errorResponse("API key not fully activated (no master key bound)", 403, "configuration_error");
  }

  // Ensure wallet exists and check balance (server-side enforcement).
  const wallet = await ensureWallet(apiKey.userId);
  const balance = Number(wallet.balance);
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
      "Insufficient credits. Please top up your wallet balance to continue using AI services.",
      402,
      "insufficient_balance",
    );
  }

  // Pre-flight minimum-credit estimate. Reject before hitting the provider if
  // the wallet cannot even cover the input plus a small output floor.
  const promptTokens = estimatePromptTokens(body.messages);
  const maxOutputTokens =
    typeof body.max_tokens === "number"
      ? body.max_tokens
      : typeof body.max_completion_tokens === "number"
        ? (body.max_completion_tokens as number)
        : 256;
  const minCost = estimateMinimumCost({ resolvedModel, promptTokens, maxOutputTokens });
  if (balance < minCost) {
    console.log(`[v1/chat] insufficient balance for estimate: bal=${balance} min=${minCost}`);
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
      "Insufficient credits. Please top up your wallet balance to continue using AI services.",
      402,
      "insufficient_balance",
    );
  }

  body.model = resolvedModel.masterId;
  const isStream = body.stream === true;

  const upstreamUrl = `${MASTER_API_URL}/chat/completions`;
  console.log("[v1/chat] forwarding to:", upstreamUrl, "stream:", isStream);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.masterApiKey}`,
      },
      body: JSON.stringify(body),
    });

    console.log("[v1/chat] upstream status:", upstream.status);

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("[v1/chat] upstream error:", upstream.status, text.slice(0, 500));
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

    if (isStream && upstream.body) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = upstream.body.getReader();
      let promptTokens = 0;
      let completionTokens = 0;
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
                      promptTokens = parsed.usage.prompt_tokens || 0;
                      completionTokens = parsed.usage.completion_tokens || 0;
                    }
                  } catch {
                    // skip non-JSON chunks
                  }
                }
                controller.enqueue(encoder.encode(line + "\n"));
              }
            }
            if (buffer) controller.enqueue(encoder.encode(buffer));
          } finally {
            // Charge wallet based on actual usage
            if (promptTokens > 0 || completionTokens > 0) {
              const chargeResult = await recordUsageWithBilling({
                userId: apiKey.userId,
                apiKeyId: apiKey.id,
                resolvedModel,
                inputTokens: promptTokens,
                outputTokens: completionTokens,
                requestMeta: buildMeta(200),
              });

              if (chargeResult.ok) {
                // Emit billing as an SSE comment line (starts with ":").
                // Per the SSE spec, comment lines are silently ignored by
                // all SSE parsers — including the OpenAI SDK, Chatbox AI,
                // LibreChat, and Open WebUI. This keeps the stream fully
                // OpenAI-compatible (every `data:` line remains a valid
                // ChatCompletionChunk with `choices`) while still exposing
                // billing to custom clients that parse comments.
                const billingComment = `: x_billing ${JSON.stringify(chargeResult.billing)}\n`;
                controller.enqueue(encoder.encode(billingComment));
              } else {
                // Charge failed after the completion was already streamed.
                // Record the real usage as an error so the leakage is
                // visible in audit logs.
                console.error("[v1/chat] billing failed after streaming:", chargeResult.error);
                await logNonBilledUsage({
                  userId: apiKey.userId,
                  apiKeyId: apiKey.id,
                  aiModelId: resolvedModel.id,
                  modelLabel: resolvedModel.modelId,
                  provider: resolvedModel.provider,
                  status: "error",
                  requestMeta: buildMeta(200),
                });
              }
            } else {
              // Zero-usage — still log a zero-cost audit row.
              await recordUsageWithBilling({
                userId: apiKey.userId,
                apiKeyId: apiKey.id,
                resolvedModel,
                inputTokens: 0,
                outputTokens: 0,
                requestMeta: buildMeta(200),
              });
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

    const rawText = await upstream.text();
    let data: { usage?: { prompt_tokens?: number; completion_tokens?: number } };
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[v1/chat] JSON parse failed. Raw (first 500):", rawText.slice(0, 500));
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
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;

    // Charge wallet and get billing info
    const chargeResult = await recordUsageWithBilling({
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      resolvedModel,
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      requestMeta: buildMeta(200),
    });

    if (!chargeResult.ok) {
      // Billing failed (e.g. balance dropped between pre-check and charge).
      // Do not return the completion for free — record the real usage as an
      // error and return a 402 so the client knows to top up.
      console.error("[v1/chat] billing failed:", chargeResult.error);
      await logNonBilledUsage({
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        aiModelId: resolvedModel.id,
        modelLabel: resolvedModel.modelId,
        provider: resolvedModel.provider,
        status: "error",
        requestMeta: buildMeta(402),
      });
      return errorResponse(
        "Insufficient credits. Please top up your wallet balance to continue using AI services.",
        402,
        "insufficient_balance",
      );
    }

    // Attach billing info to response (custom field, OpenAI SDK ignores unknown fields)
    (data as Record<string, unknown>).x_billing = chargeResult.billing;

    return Response.json(data, { headers: corsHeaders() });
  } catch (e) {
    console.error("[v1/chat/completions] proxy error:", e);
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
