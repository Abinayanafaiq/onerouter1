import {
  authenticateRequest,
  getClientIp,
  createApiRequestLog,
  errorResponse,
} from "@/app/lib/proxy-utils";
import { getAvailableModels } from "@/app/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "/v1/models";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const clientIp = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  const apiKey = await authenticateRequest(request.headers.get("authorization"), { clientIp });
  if (!apiKey) {
    return errorResponse("Invalid API key", 401, "authentication_error");
  }

  const models = await getAvailableModels();

  // Record a lightweight (zero-cost) request log for the models listing.
  void createApiRequestLog({
    apiKeyId: apiKey.id,
    userId: apiKey.userId,
    provider: "onerouter",
    model: "models.list",
    endpoint: ENDPOINT,
    method: "GET",
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    remainingBalance: 0,
    responseTime: Date.now() - startedAt,
    statusCode: 200,
    success: true,
    clientIp,
    userAgent,
  });

  const now = Math.floor(Date.now() / 1000);
  return Response.json({
    object: "list",
    data: models.map((m) => ({
      id: m.modelId,
      object: "model",
      created: now,
      owned_by: m.provider,
    })),
  }, { headers: corsHeaders() });
}
