import { checkRateLimit, checkUserRateLimit } from "@/app/lib/rate-limit";
import {
  authenticateRequest,
  computeSessionHash,
  errorResponse,
  estimatePromptTokens,
  getClientIp,
  sanitizeUpstreamError,
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

// Timestamp lokal server untuk prefix log debug (format: YYYY-MM-DD HH:mm:ss)
const ts = () => new Date().toLocaleString("sv-SE");

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
  if (!apiKey) {
    console.warn(`[${ts()}] [v1/package/chat] auth gagal: API key tidak valid/kedaluwarsa dari ip=${clientIp}`);
    return apiError("API key tidak valid atau kedaluwarsa.", 401, "authentication_error", "invalid_api_key");
  }
  if (apiKey.billingMode !== "TOKEN_PACKAGE") {
    console.warn(`[${ts()}] [v1/package/chat] ditolak: key=${apiKey.id} user=${apiKey.userId} billingMode=${apiKey.billingMode} (bukan paket)`);
    return apiError("Endpoint ini hanya menerima API key paket.", 403, "invalid_api_key_mode", "package_key_required");
  }
  if (!PACKAGE_UPSTREAM_API_KEY) {
    console.error(`[${ts()}] [v1/package/chat] PACKAGE_UPSTREAM_API_KEY belum diset di env`);
    return apiError("Upstream paket belum dikonfigurasi.", 503, "configuration_error", "package_upstream_unavailable");
  }

  const keyLimit = checkRateLimit(apiKey.id, apiKey.rateLimit);
  const userLimit = checkUserRateLimit(apiKey.userId, apiKey.user.rateLimit);
  const limit = !keyLimit.allowed ? keyLimit : !userLimit.allowed ? userLimit : null;
  if (limit) {
    console.warn(`[${ts()}] [v1/package/chat] rate limited key=${apiKey.id} user=${apiKey.userId} retryAfter=${limit.retryAfter}s`);
    return Response.json(
      { error: { message: "Terlalu banyak request.", type: "rate_limit_error", param: null, code: "rate_limit_exceeded" } },
      { status: 429, headers: { ...corsHeaders(), "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    console.warn(`[${ts()}] [v1/package/chat] body JSON tidak valid key=${apiKey.id} user=${apiKey.userId}`);
    return apiError("Body JSON tidak valid.", 400, "invalid_request_error", "invalid_json");
  }

  const requestedModel = typeof body.model === "string" ? body.model : "";
  if (!requestedModel) {
    console.warn(`[${ts()}] [v1/package/chat] field model kosong key=${apiKey.id}`);
    return apiError("Model wajib diisi.", 400, "invalid_request_error", "model_required");
  }
  const model = await resolvePackageModel(requestedModel);
  if (!model) {
    console.warn(`[${ts()}] [v1/package/chat] model '${requestedModel}' tidak dikenal key=${apiKey.id}`);
    return apiError(`Model '${requestedModel}' tidak didukung.`, 400, "invalid_request_error", "model_not_found");
  }
  if (!model.enabled) {
    console.warn(`[${ts()}] [v1/package/chat] model '${requestedModel}' sedang disabled key=${apiKey.id}`);
    return apiError(`Model '${requestedModel}' sedang tidak tersedia.`, 503, "model_unavailable", "model_unavailable");
  }

  // Paket khusus: key yang diterbitkan dari paket dengan allowedModels terisi
  // hanya boleh memakai model tersebut. Array kosong = semua model paket boleh.
  const keyAllowedModels = apiKey.allowedModels ?? [];
  if (
    keyAllowedModels.length > 0 &&
    !keyAllowedModels.includes(model.modelId) &&
    !keyAllowedModels.includes(model.upstreamId)
  ) {
    console.warn(`[${ts()}] [v1/package/chat] model '${requestedModel}' tidak termasuk paket key=${apiKey.id} allowed=[${keyAllowedModels.join(",")}]`);
    return apiError(
      `Model '${requestedModel}' tidak termasuk dalam paket Anda.`,
      403,
      "invalid_request_error",
      "model_not_in_package",
    );
  }
  if (body.stream === true && !model.supportsStreaming) {
    console.warn(`[${ts()}] [v1/package/chat] model '${requestedModel}' tidak support streaming key=${apiKey.id}`);
    return apiError(`Model '${requestedModel}' tidak mendukung streaming.`, 400, "invalid_request_error", "streaming_not_supported");
  }

  const promptEstimate = estimatePromptTokens(body.messages);
  const requestedMax = typeof body.max_tokens === "number"
    ? body.max_tokens
    : typeof body.max_completion_tokens === "number" ? body.max_completion_tokens : 4096;
  const maxOutput = Math.min(Math.max(Math.floor(requestedMax), 1), 8192);
  const reservation = await reservePackageTokens(apiKey.id, promptEstimate + maxOutput);
  if (!reservation.ok) {
    console.warn(`[${ts()}] [v1/package/chat] kuota tidak cukup key=${apiKey.id} user=${apiKey.userId} butuh=${promptEstimate + maxOutput} (prompt~${promptEstimate} + maxOut=${maxOutput})`);
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

  const upstreamUrl = `${PACKAGE_UPSTREAM_URL}/chat/completions`;
  console.log(
    `[${ts()}] [v1/package/chat] forwarding to: ${upstreamUrl} model=${requestedModel}->${model.upstreamId} stream=${isStream} reserved=${promptEstimate + maxOutput} key=${apiKey.id} user=${apiKey.userId}`,
  );

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PACKAGE_UPSTREAM_API_KEY}`,
        "x-session-hash": computeSessionHash(apiKey.userId),
      },
      body: JSON.stringify(body),
      signal: request.signal,
    });
  } catch (err) {
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error(`[${ts()}] [v1/package/chat] gagal menghubungi upstream: ${reason}${request.signal.aborted ? " (client abort)" : ""}`);
    await releasePackageTokens(reservation.id);
    return apiError("Gagal menghubungi upstream paket.", 502, "api_error", "upstream_unavailable");
  }
  console.log(`[${ts()}] [v1/package/chat] upstream status:`, upstream.status);

  if (!upstream.ok) {
    const upstreamMessage = await upstream.text().catch(() => "");
    console.error(`[${ts()}] [v1/package/chat] upstream error:`, upstream.status, upstreamMessage.slice(0, 500));
    await releasePackageTokens(reservation.id);
    console.log(`[${ts()}] [v1/package/chat] reservation released (upstream error)`);
    // Sanitize: never forward the upstream body — it may name the real
    // provider or leak upstream billing/quota state.
    const safe = sanitizeUpstreamError(upstream.status);
    return apiError(safe.message, safe.status, "api_error", "upstream_error");
  }

  if (isStream && upstream.body) {
    console.log(`[${ts()}] [v1/package/chat] streaming dimulai model=${model.upstreamId} key=${apiKey.id}`);
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
        } catch (err) {
          const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
          console.error(`[${ts()}] [v1/package/chat] error saat membaca stream upstream: ${reason}`);
          throw err;
        } finally {
          // If the vendor omits usage, charge conservative local estimates rather than a free request.
          if (inputTokens + outputTokens === 0) {
            console.warn(`[${ts()}] [v1/package/chat] upstream tidak mengirim usage; tagih estimasi prompt~${promptEstimate} out=${maxOutput} key=${apiKey.id}`);
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
            console.log(`[${ts()}] [v1/package/chat] stream settled: in=${inputTokens} out=${outputTokens} dur=${Date.now() - startedAt}ms key=${apiKey.id}`);
            controller.enqueue(encoder.encode(`: x_package_usage ${JSON.stringify(settled.usage)}\n\n`));
          } else {
            console.error(`[${ts()}] [v1/package/chat] settle GAGAL (stream): in=${inputTokens} out=${outputTokens} reservation=${reservation.id} key=${apiKey.id} user=${apiKey.userId}`);
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
    console.error(`[${ts()}] [v1/package/chat] upstream balas bukan JSON valid (status ${upstream.status}):`, raw.slice(0, 500));
    await releasePackageTokens(reservation.id);
    console.log(`[${ts()}] [v1/package/chat] reservation released (invalid upstream response)`);
    return apiError("Upstream mengembalikan respons yang tidak valid.", 502, "api_error", "invalid_upstream_response");
  }
  let { input, output } = normalizedUsage(data.usage);
  if (input + output === 0) {
    console.warn(`[${ts()}] [v1/package/chat] usage 0/0 dari upstream; tagih estimasi prompt~${promptEstimate} out=${maxOutput} key=${apiKey.id}`);
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
  if (!settled.ok) {
    console.error(`[${ts()}] [v1/package/chat] settle GAGAL: in=${input} out=${output} reservation=${reservation.id} key=${apiKey.id} user=${apiKey.userId}`);
    return apiError("Gagal mencatat penggunaan paket.", 500, "billing_error", "settlement_failed");
  }
  console.log(`[${ts()}] [v1/package/chat] settled: in=${input} out=${output} dur=${Date.now() - startedAt}ms key=${apiKey.id}`);
  data.x_package_usage = settled.usage;
  return Response.json(data, { headers: corsHeaders() });
}
