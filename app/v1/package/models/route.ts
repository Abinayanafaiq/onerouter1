import { authenticateRequest, errorResponse, getClientIp } from "@/app/lib/proxy-utils";
import { getAvailableModels } from "@/app/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function GET(request: Request) {
  const key = await authenticateRequest(request.headers.get("authorization"), {
    clientIp: getClientIp(request.headers),
  });
  if (!key) return errorResponse("API key tidak valid atau kedaluwarsa.", 401, "authentication_error");
  if (key.billingMode !== "TOKEN_PACKAGE") {
    return errorResponse("Endpoint ini hanya menerima API key paket.", 403, "invalid_api_key_mode", "package_key_required");
  }
  if (key.tokenUsed >= key.tokenQuota) {
    return errorResponse("Kuota paket telah habis. Silakan beli paket baru.", 402, "insufficient_quota", "package_quota_exhausted");
  }

  const models = await getAvailableModels();
  const now = Math.floor(Date.now() / 1000);
  return Response.json({
    object: "list",
    data: models.map((model) => ({
      id: model.modelId,
      object: "model",
      created: now,
      owned_by: model.provider,
    })),
  }, { headers: cors });
}
