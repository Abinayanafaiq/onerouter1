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
  type RequestMeta,
} from "@/app/lib/proxy-utils";
import { MASTER_API_KEY } from "@/app/lib/constants";

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

  const masterApiKey = MASTER_API_KEY || apiKey.masterApiKey || null;
  if (!masterApiKey) {
    return errorResponse(
      "API key not fully activated (no master key bound)",
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
  const upstreamUrl = `${process.env.MASTER_API_URL || "https://limitrouter.com/v1"}/chat/completions`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("[api/dashboard/chat] upstream error:", upstream.status, text.slice(0, 500));

      // Release the full reservation
      await releaseReservation({
        walletId: reservation.walletId,
        reservedAmount: reservation.reservedAmount,
        description: resolvedModel.modelId,
      });
      console.log("[api/dashboard/chat] reservation released (upstream error)");

      await logNonBilledUsage({
        userId,
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

    const rawText = await upstream.text();
    let data: { usage?: { prompt_tokens?: number; completion_tokens?: number } };
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[api/dashboard/chat] JSON parse failed. Raw (first 500):", rawText.slice(0, 500));

      // Release reservation — no valid response to bill
      await releaseReservation({
        walletId: reservation.walletId,
        reservedAmount: reservation.reservedAmount,
        description: resolvedModel.modelId,
      });
      console.log("[api/dashboard/chat] reservation released (non-JSON response)");

      await logNonBilledUsage({
        userId,
        apiKeyId: apiKey.id,
        aiModelId: resolvedModel.id,
        modelLabel: resolvedModel.modelId,
        provider: resolvedModel.provider,
        status: "error",
        requestMeta: buildMeta(502),
      });
      return errorResponse("Upstream returned a non-JSON response", 502, "api_error");
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
