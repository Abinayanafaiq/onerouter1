import { authenticateRequest, resolveMasterModel, recordUsage, errorResponse } from "@/app/lib/proxy-utils";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { MASTER_API_URL } from "@/app/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  console.log("[v1/chat] request received");

  const apiKey = await authenticateRequest(request.headers.get("authorization"));
  if (!apiKey) {
    console.log("[v1/chat] auth failed - invalid key");
    return errorResponse("Invalid API key or key expired", 401, "authentication_error");
  }
  console.log("[v1/chat] auth ok, keyId:", apiKey.id, "masterApiKey set:", !!apiKey.masterApiKey);

  const rateLimit = checkRateLimit(apiKey.id);
  if (!rateLimit.allowed) {
    console.log("[v1/chat] rate limited");
    return Response.json(
      { error: { message: "Rate limit exceeded. Too many requests.", type: "rate_limit_error", param: null, code: "rate_limit_exceeded" } },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
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

  const masterModel = resolveMasterModel(model);
  if (!masterModel) {
    console.log("[v1/chat] model not supported:", model);
    return errorResponse(`Model '${model}' not supported`, 400, "invalid_request_error");
  }
  console.log("[v1/chat] resolved master model:", masterModel);

  if (!apiKey.masterApiKey) {
    console.log("[v1/chat] no master key bound");
    return errorResponse("API key not fully activated (no master key bound)", 403, "configuration_error");
  }

  body.model = masterModel;
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
            controller.close();
            if (promptTokens > 0 || completionTokens > 0) {
              await recordUsage(apiKey.id, model, promptTokens, completionTokens);
            } else {
              await recordUsage(apiKey.id, model, 0, 0);
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
      return new Response(rawText, {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    await recordUsage(apiKey.id, model, promptTokens, completionTokens);

    return Response.json(data, { headers: corsHeaders() });
  } catch (e) {
    console.error("[v1/chat/completions] proxy error:", e);
    return errorResponse("Failed to reach upstream API", 502, "api_error");
  }
}