import { checkKeyAndUserRateLimit } from "@/app/lib/rate-limit";
import {
  authenticateRequest,
  computeSessionHash,
  errorResponse,
  estimatePromptTokens,
  getClientIp,
  sanitizeUpstreamError,
  normalizeReasoningEffort,
  dedupeReasoningFields,
  repairToolCallArguments,
  reconcileToolMessages,
  normalizeUserMessageContent,
  normalizeToolChoice,
  stripUnsupportedFields,
  withNonStreamKeepAlive,
  sanitizeStreamErrorLine,
  describeRequestShape,
  type RequestMeta,
} from "@/app/lib/proxy-utils";

import { resolvePackageModel } from "@/app/lib/package-models";
import { DsmlStreamFixer, fixDsmlInCompletion, requestHasTools } from "@/app/lib/dsml-tool-calls";
import { createApiRequestLog } from "@/app/lib/api-request-log";
import { resolveBackupUpstreams, isBackupFailoverStatus } from "@/app/lib/backup-routing";
import { logFailover } from "@/app/lib/failover-log";
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

// Header respons upstream yang berguna untuk melacak asal error (proxy/CDN
// mana yang menolak, request id untuk dilaporkan ke penyedia upstream).
const UPSTREAM_DEBUG_HEADERS = ["server", "via", "cf-ray", "x-request-id", "request-id", "x-amzn-requestid", "content-type", "retry-after"];

/** Ringkasan request keluar + respons upstream untuk log error. Tanpa nilai rahasia. */
function describeUpstreamFailure(opts: {
  target: { url: string; label?: string };
  attempt: number;
  totalTargets: number;
  headers: Record<string, string>;
  bodyBytes: number;
  messageCount: number;
  upstream: Response;
}) {
  const { target, upstream } = opts;
  let endpoint = target.url;
  try {
    const u = new URL(target.url);
    endpoint = `${u.host}${u.pathname}`;
  } catch {}
  // Ukuran tiap header yang kita kirim — penting untuk 431 (header terlalu besar).
  const headerSizes = Object.entries(opts.headers)
    .map(([k, v]) => `${k}=${v.length}B`)
    .join(",");
  const headerTotal = Object.entries(opts.headers).reduce((n, [k, v]) => n + k.length + v.length + 4, 0);
  const respHeaders = UPSTREAM_DEBUG_HEADERS
    .map((h) => [h, upstream.headers.get(h)] as const)
    .filter(([, v]) => v)
    .map(([h, v]) => `${h}=${v}`)
    .join(" ");
  return [
    `target=${target.label || "upstream"} (${opts.attempt}/${opts.totalTargets})`,
    `endpoint=${endpoint}`,
    `url_len=${target.url.length}`,
    `req_headers=${headerTotal}B [${headerSizes}]`,
    `req_body=${opts.bodyBytes}B messages=${opts.messageCount}`,
    respHeaders ? `resp_headers: ${respHeaders}` : "resp_headers: -",
  ].join(" | ");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function apiError(message: string, status: number, type: string, code: string, param: string | null = null) {
  return Response.json({ error: { message, type, param, code } }, { status, headers: corsHeaders() });
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
  // Body hanya diintip untuk tahu client minta SSE atau tidak; handleChat
  // mem-parse ulang. Request non-stream yang lambat dikirimi newline keep-alive
  // supaya tidak diputus reverse proxy (nginx/Cloudflare).
  const wantsStream = await request
    .clone()
    .json()
    .then((b: unknown) => (b as { stream?: unknown } | null)?.stream === true)
    .catch(() => false);
  const work = handleChat(request);
  if (wantsStream) return work;
  return withNonStreamKeepAlive(work, corsHeaders(), `[${ts()}] [v1/package/chat]`);
}

async function handleChat(request: Request) {
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
    console.warn(`[${ts()}] [v1/package/chat] ditolak: key=${apiKey.id} user=${apiKey.user.email} (${apiKey.userId}) billingMode=${apiKey.billingMode} (bukan paket)`);
    return apiError("Endpoint ini hanya menerima API key paket.", 403, "invalid_api_key_mode", "package_key_required");
  }
  if (!PACKAGE_UPSTREAM_API_KEY) {
    console.error(`[${ts()}] [v1/package/chat] PACKAGE_UPSTREAM_API_KEY belum diset di env`);
    return apiError("Upstream paket belum dikonfigurasi.", 503, "configuration_error", "package_upstream_unavailable");
  }

  const limit = checkKeyAndUserRateLimit(apiKey.id, apiKey.rateLimit, apiKey.userId, apiKey.user.rateLimit);
  if (!limit.allowed) {
    console.warn(`[${ts()}] [v1/package/chat] rate limited key=${apiKey.id} user=${apiKey.user.email} (${apiKey.userId}) retryAfter=${limit.retryAfter}s`);
    return Response.json(
      { error: { message: "Terlalu banyak request.", type: "rate_limit_error", param: null, code: "rate_limit_exceeded" } },
      { status: 429, headers: { ...corsHeaders(), "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    console.warn(`[${ts()}] [v1/package/chat] body JSON tidak valid key=${apiKey.id} user=${apiKey.user.email} (${apiKey.userId})`);
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
    console.warn(`[${ts()}] [v1/package/chat] kuota tidak cukup key=${apiKey.id} user=${apiKey.user.email} (${apiKey.userId}) butuh=${promptEstimate + maxOutput} (prompt~${promptEstimate} + maxOut=${maxOutput})`);
    return apiError("Kuota paket tidak mencukupi. Silakan beli paket baru.", 402, "insufficient_quota", "package_quota_exhausted");
  }

  // Request gagal karena upstream ikut dicatat supaya uptime paket di halaman
  // status tidak hanya berisi request sukses. Best-effort, tidak pernah throw.
  const logUpstreamFailure = (statusCode: number) =>
    createApiRequestLog({
      apiKeyId: apiKey.id,
      userId: apiKey.userId,
      provider: model.provider,
      model: model.modelId,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      remainingBalance: 0,
      success: false,
      ...meta(statusCode),
    });

  // Backup upstream routing: model paket tertentu dilayani upstream sekunder
  // dengan endpoint, key, dan model ID sendiri. Kalau tidak ada upstream
  // backup (dengan key yang valid) untuk model ini, pakai upstream paket.
  // Kalau beberapa upstream melayani model yang sama, dicoba sesuai urutan
  // prioritas admin dan dilempar ke upstream berikutnya kalau gagal.
  const backupUpstreams = await resolveBackupUpstreams(model.modelId);
  const targets = backupUpstreams.length > 0
    ? backupUpstreams.map((b) => ({
        url: `${b.url}/chat/completions`,
        apiKey: b.apiKey,
        model: b.upstreamModelId,
        label: b.label,
      }))
    : [{
        url: `${PACKAGE_UPSTREAM_URL}/chat/completions`,
        apiKey: PACKAGE_UPSTREAM_API_KEY,
        model: model.upstreamId,
        label: "",
      }];

  body.model = targets[0].model;
  // Nilai reasoning_effort yang ditolak model (mis. "medium" di DeepSeek V4.1)
  // dipetakan ke nilai terdekat yang diterima supaya tidak berujung 400.
  const effortMapped = normalizeReasoningEffort(body, [model.modelId, model.upstreamId]);
  if (effortMapped) {
    console.log(`[${ts()}] [v1/package/chat] reasoning_effort ${effortMapped.from} -> ${effortMapped.to} model=${model.modelId}`);
  }
  // Pesan history yang membawa `reasoning` + `reasoning_content` sekaligus
  // ditolak upstream (duplicate field), jadi disatukan ke reasoning_content.
  const reasoningDeduped = dedupeReasoningFields(body);
  if (reasoningDeduped > 0) {
    console.log(`[${ts()}] [v1/package/chat] dedupe reasoning/reasoning_content di ${reasoningDeduped} pesan key=${apiKey.id}`);
  }
  // Argumen tool call yang terpotong di history (respons sebelumnya putus di
  // tengah tool call) ditolak upstream dengan 400, jadi diperbaiki dulu.
  const toolArgsRepaired = repairToolCallArguments(body);
  if (toolArgsRepaired > 0) {
    console.log(`[${ts()}] [v1/package/chat] perbaiki arguments tool_calls tidak valid di ${toolArgsRepaired} tool call key=${apiKey.id}`);
  }
  // Tool call tanpa result / result tanpa tool call (call di-interrupt,
  // history dipotong) ditolak upstream dengan 400 "tool calls and tool
  // results do not match".
  const toolPairing = reconcileToolMessages(body);
  if (toolPairing.inserted || toolPairing.dropped || toolPairing.moved) {
    console.log(
      `[${ts()}] [v1/package/chat] rekonsiliasi pesan tool: sisip=${toolPairing.inserted} buang=${toolPairing.dropped} pindah=${toolPairing.moved} key=${apiKey.id}`,
    );
  }
  // Content pesan user dengan format non-OpenAI (part `image` ala Anthropic,
  // `input_text`, image_url berupa string, content null) ditolak upstream
  // dengan 400 "untagged enum ChatCompletionRequestUserMessageContent".
  const userContentFixed = normalizeUserMessageContent(body);
  if (userContentFixed > 0) {
    console.log(`[${ts()}] [v1/package/chat] normalisasi content user di ${userContentFixed} pesan key=${apiKey.id}`);
  }
  // tool_choice berbentuk objek ({"type":"function",...}) ditolak upstream
  // dengan 400 "cannot unmarshal object ... tool_choice of type string".
  const toolChoiceFixed = normalizeToolChoice(body);
  if (toolChoiceFixed) {
    console.log(
      `[${ts()}] [v1/package/chat] tool_choice ${toolChoiceFixed.from} -> "${toolChoiceFixed.to}"${toolChoiceFixed.narrowedTo ? ` (tools disaring ke ${toolChoiceFixed.narrowedTo})` : ""} key=${apiKey.id}`,
    );
  }
  // Field tambahan dari client (promptCacheKey, setCacheKey, session_id, ...)
  // ditolak upstream dengan 400 "Extra inputs are not permitted".
  const strippedFields = stripUnsupportedFields(body);
  if (strippedFields.length > 0) {
    console.log(`[${ts()}] [v1/package/chat] buang field tidak didukung: ${strippedFields.join(", ")} key=${apiKey.id}`);
  }
  const isStream = body.stream === true;
  if (isStream) {
    const existing = body.stream_options;
    body.stream_options = {
      ...(existing && typeof existing === "object" ? existing : {}),
      include_usage: true,
    };
  }

  let upstream!: Response;
  let failureContext = "";
  for (const [i, target] of targets.entries()) {
    // Hanya upstream backup yang bukan kandidat terakhir yang boleh failover.
    const canFailover = i + 1 < targets.length;
    body.model = target.model;
    console.log(
      `[${ts()}] [v1/package/chat] forwarding to: ${target.url} model=${requestedModel}->${body.model}${target.label ? ` (${target.label}, ${i + 1}/${targets.length})` : ""} stream=${isStream} reserved=${promptEstimate + maxOutput} key=${apiKey.id} user=${apiKey.user.email} (${apiKey.userId})`,
    );

    const outHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${target.apiKey}`,
      "x-session-hash": computeSessionHash(apiKey.userId),
    };
    const outBody = JSON.stringify(body);
    try {
      upstream = await fetch(target.url, {
        method: "POST",
        headers: outHeaders,
        body: outBody,
        signal: request.signal,
      });
    } catch (err) {
      const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      if (canFailover && !request.signal.aborted) {
        logFailover(`[v1/package/chat] ${target.label || "upstream"} tidak terjangkau (${reason}), failover ke upstream berikutnya key=${apiKey.id}`);
        continue;
      }
      console.error(`[${ts()}] [v1/package/chat] gagal menghubungi upstream${target.label ? ` ${target.label}` : ""}: ${reason}${request.signal.aborted ? " (client abort)" : ""}`);
      await releasePackageTokens(reservation.id);
      // Client yang membatalkan request bukan gangguan layanan.
      if (!request.signal.aborted) await logUpstreamFailure(502);
      return apiError("Gagal menghubungi upstream paket.", 502, "api_error", "upstream_unavailable");
    }
    console.log(`[${ts()}] [v1/package/chat] upstream status:`, upstream.status);
    if (!upstream.ok) {
      failureContext = describeUpstreamFailure({
        target,
        attempt: i + 1,
        totalTargets: targets.length,
        headers: outHeaders,
        bodyBytes: Buffer.byteLength(outBody),
        messageCount: Array.isArray(body.messages) ? body.messages.length : 0,
        upstream,
      });
    }

    if (!upstream.ok && canFailover && isBackupFailoverStatus(upstream.status)) {
      const text = await upstream.text().catch(() => "");
      logFailover(
        `[v1/package/chat] ${target.label} error ${upstream.status}, failover ke upstream berikutnya key=${apiKey.id}: ${text.slice(0, 200)} | ${failureContext}`,
      );
      continue;
    }
    break;
  }

  if (!upstream.ok) {
    const upstreamMessage = await upstream.text().catch(() => "");
    console.error(
      `[${ts()}] [v1/package/chat] upstream error: ${upstream.status} ${upstreamMessage.slice(0, 500).replace(/\s*\n\s*/g, " ")}` +
        ` | model=${requestedModel}->${body.model} stream=${isStream} key=${apiKey.id} user=${apiKey.user.email} (${apiKey.userId}) | ${failureContext}`,
    );
    await releasePackageTokens(reservation.id);
    console.log(`[${ts()}] [v1/package/chat] reservation released (upstream error)`);
    await logUpstreamFailure(upstream.status);
    // Sanitize: never forward the upstream body — it may name the real
    // provider or leak upstream billing/quota state.
    const safe = sanitizeUpstreamError(upstream.status, upstreamMessage);
    return apiError(safe.message, safe.status, safe.type, safe.code ?? "upstream_error", safe.param);
  }

  if (isStream && upstream.body) {
    console.log(`[${ts()}] [v1/package/chat] streaming dimulai model=${model.upstreamId} key=${apiKey.id}`);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();
    let buffer = "";
    let inputTokens = 0;
    let outputTokens = 0;
    // DeepSeek kadang membocorkan markup tool call DSML mentah ke content;
    // ubah kembali jadi delta tool_calls native kalau client mengirim tools.
    const dsmlFixer = requestHasTools(body) ? new DsmlStreamFixer() : null;

    const stream = new ReadableStream({
      async start(controller) {
        const forward = (line: string) => {
          for (const out of dsmlFixer ? dsmlFixer.transformLine(line) : [line]) {
            controller.enqueue(encoder.encode(`${out}\n`));
          }
        };
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
              if (payload !== "[DONE]") forward(sanitizeStreamErrorLine(line, "[v1/package/chat]", () => describeRequestShape(body)));
            }
          }
          if (buffer && !buffer.includes("[DONE]")) forward(buffer);
        } catch (err) {
          const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
          console.error(`[${ts()}] [v1/package/chat] error saat membaca stream upstream: ${reason}`);
          throw err;
        } finally {
          if (dsmlFixer) {
            for (const out of dsmlFixer.flush()) controller.enqueue(encoder.encode(`${out}\n`));
            if (dsmlFixer.recovered > 0) {
              console.log(`[${ts()}] [v1/package/chat] ubah ${dsmlFixer.recovered} tool call DSML bocor jadi tool_calls (stream) key=${apiKey.id}`);
            }
          }
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
            console.error(`[${ts()}] [v1/package/chat] settle GAGAL (stream): in=${inputTokens} out=${outputTokens} reservation=${reservation.id} key=${apiKey.id} user=${apiKey.user.email} (${apiKey.userId})`);
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
    await logUpstreamFailure(502);
    return apiError("Upstream mengembalikan respons yang tidak valid.", 502, "api_error", "invalid_upstream_response");
  }
  if (requestHasTools(body)) {
    const recovered = fixDsmlInCompletion(data);
    if (recovered > 0) {
      console.log(`[${ts()}] [v1/package/chat] ubah ${recovered} tool call DSML bocor jadi tool_calls key=${apiKey.id}`);
    }
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
    console.error(`[${ts()}] [v1/package/chat] settle GAGAL: in=${input} out=${output} reservation=${reservation.id} key=${apiKey.id} user=${apiKey.user.email} (${apiKey.userId})`);
    return apiError("Gagal mencatat penggunaan paket.", 500, "billing_error", "settlement_failed");
  }
  console.log(`[${ts()}] [v1/package/chat] settled: in=${input} out=${output} dur=${Date.now() - startedAt}ms key=${apiKey.id}`);
  data.x_package_usage = settled.usage;
  return Response.json(data, { headers: corsHeaders() });
}
