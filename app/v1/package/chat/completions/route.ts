import { checkRateLimit, checkUserRateLimit } from "@/app/lib/rate-limit";
import {
  authenticateRequest,
  errorResponse,
  estimatePromptTokens,
  getClientIp,
  type RequestMeta,
} from "@/app/lib/proxy-utils";
import { resolvePackageModel } from "@/app/lib/package-models";
import {
  releasePackageTokens,
  reservePackageTokens,
  settlePackageTokens,
} from "@/app/lib/package-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "/v1/package/chat/completions";
const PACKAGE_UPSTREAM_URL = (process.env.PACKAGE_UPSTREAM_URL || "https://weizerouter.web.id/v1").replace(/\/$/, "");
const PACKAGE_UPSTREAM_API_KEY = process.env.PACKAGE_UPSTREAM_API_KEY || "";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function apiError(message: string, status: number, type: string, code: string) {
  return Response.json({ error: { message, type, param: null, code } }, { status, headers: corsHeaders() });
}

function normalizedUsage(usage: unknown) {
  const value = usage && typeof usage === "object" ? usage as Record<string, unknown> : {};
  const input = Number(value.prompt_tokens ?? value.input_tokens ?? 0);
  const output = Number(value.completion_tokens ?? value.output_tokens ?? 0);
  return {
    input: Number.isFinite(input) && input > 0 ? Math.floor(input) : 0,
    output: Number.isFinite(output) && output > 0 ? Math.floor(output) : 0,
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const clientIp = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");
  const meta = (statusCode: number): RequestMeta => ({
    endpoint: ENDPOINT,
    method: "POST",
    responseTime: Date.now() - startedAt,
    statusCode,
    clientIp,
    userAgent,
  });

  const apiKey = await authenticateRequest(request.headers.get("authorization"), { clientIp });
  if (!apiKey) return apiError("API key tidak valid atau kedaluwarsa.", 401, "authentication_error", "invalid_api_key");
  if (apiKey.billingMode !== "TOKEN_PACKAGE") {
    return apiError("Endpoint ini hanya menerima API key paket.", 403, "invalid_api_key_mode", "package_key_required");
  }
  if (!PACKAGE_UPSTREAM_API_KEY) {
    return apiError("Upstream paket belum dikonfigurasi.", 503, "configuration_error", "package_upstream_unavailable");
  }

  const keyLimit = checkRateLimit(apiKey.id, apiKey.rateLimit);
  const userLimit = checkUserRateLimit(apiKey.userId, apiKey.user.rateLimit);
  const limit = !keyLimit.allowed ? keyLimit : !userLimit.allowed ? userLimit : null;
  if (limit) {
    return Response.json(
      { error: { message: "Terlalu banyak request.", type: "rate_limit_error", param: null, code: "rate_limit_exceeded" } },
      { status: 429, headers: { ...corsHeaders(), "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return apiError("Body JSON tidak valid.", 400, "invalid_request_error", "invalid_json");
  }

  const requestedModel = typeof body.model === "string" ? body.model : "";
  if (!requestedModel) return apiError("Model wajib diisi.", 400, "invalid_request_error", "model_required");
  const model = await resolvePackageModel(requestedModel);
  if (!model) return apiError(`Model '${requestedModel}' tidak didukung.`, 400, "invalid_request_error", "model_not_found");
  if (!model.enabled) {
    return apiError(`Model '${requestedModel}' sedang tidak tersedia.`, 503, "model_unavailable", "model_unavailable");
  }
  if (body.stream === true && !model.supportsStreaming) {
    return apiError(`Model '${requestedModel}' tidak mendukung streaming.`, 400, "invalid_request_error", "streaming_not_supported");
  }

  const promptEstimate = estimatePromptTokens(body.messages);
  const requestedMax = typeof body.max_tokens === "number"
    ? body.max_tokens
    : typeof body.max_completion_tokens === "number" ? body.max_completion_tokens : 4096;
  const maxOutput = Math.min(Math.max(Math.floor(requestedMax), 1), 8192);
  const reservation = await reservePackageTokens(apiKey.id, promptEstimate + maxOutput);
  if (!reservation.ok) {
    return apiError("Kuota paket tidak mencukupi. Silakan beli paket baru.", 402, "insufficient_quota", "package_quota_exhausted");
  }

  body.model = model.upstreamId;
  const isStream = body.stream === true;
  if (isStream) {
    const existing = body.stream_options;
    body.stream_options = {
      ...(existing && typeof existing === "object" ? existing : {}),
      include_usage: true,
    };
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${PACKAGE_UPSTREAM_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PACKAGE_UPSTREAM_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: request.signal,
    });
  } catch {
    await releasePackageTokens(reservation.id);
    return apiError("Gagal menghubungi upstream paket.", 502, "api_error", "upstream_unavailable");
  }

  if (!upstream.ok) {
    const upstreamMessage = await upstream.text().catch(() => "");
    await releasePackageTokens(reservation.id);
    return apiError(
      `Upstream paket menolak request (${upstream.status})${upstreamMessage ? `: ${upstreamMessage.slice(0, 300)}` : ""}`,
      upstream.status,
      "api_error",
      "upstream_error",
    );
  }

  if (isStream && upstream.body) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();
    let buffer = "";
    let inputTokens = 0;
    let outputTokens = 0;

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
              const payload = line.startsWith("data:") ? line.slice(5).trim() : "";
              if (payload && payload !== "[DONE]") {
                try {
                  const parsed = JSON.parse(payload) as { usage?: unknown };
                  if (parsed.usage) ({ input: inputTokens, output: outputTokens } = normalizedUsage(parsed.usage));
                } catch {
                  // Content chunks are forwarded unchanged even if not JSON.
                }
              }
              if (payload !== "[DONE]") controller.enqueue(encoder.encode(`${line}\n`));
            }
          }
          if (buffer && !buffer.includes("[DONE]")) controller.enqueue(encoder.encode(buffer));
        } finally {
          // If the vendor omits usage, charge conservative local estimates rather than a free request.
          if (inputTokens + outputTokens === 0) {
            inputTokens = promptEstimate;
            outputTokens = maxOutput;
          }
          const settled = await settlePackageTokens({
            reservationId: reservation.id,
            apiKeyId: apiKey.id,
            userId: apiKey.userId,
            resolvedModel: model,
            inputTokens,
            outputTokens,
            requestMeta: meta(200),
          });
          if (settled.ok) {
            controller.enqueue(encoder.encode(`: x_package_usage ${JSON.stringify(settled.usage)}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
      async cancel() {
        await reader.cancel().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const raw = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    await releasePackageTokens(reservation.id);
    return apiError("Upstream mengembalikan respons yang tidak valid.", 502, "api_error", "invalid_upstream_response");
  }
  let { input, output } = normalizedUsage(data.usage);
  if (input + output === 0) {
    input = promptEstimate;
    output = maxOutput;
  }
  const settled = await settlePackageTokens({
    reservationId: reservation.id,
    apiKeyId: apiKey.id,
    userId: apiKey.userId,
    resolvedModel: model,
    inputTokens: input,
    outputTokens: output,
    requestMeta: meta(200),
  });
  if (!settled.ok) return apiError("Gagal mencatat penggunaan paket.", 500, "billing_error", "settlement_failed");
  data.x_package_usage = settled.usage;
  return Response.json(data, { headers: corsHeaders() });
}
