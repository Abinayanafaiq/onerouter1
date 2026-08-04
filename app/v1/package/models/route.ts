import { authenticateRequest, errorResponse, getClientIp } from "@/app/lib/proxy-utils";
import { getEnabledPackageModels } from "@/app/lib/package-models";
import { prisma } from "@/app/lib/prisma";

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

  const models = await getEnabledPackageModels();
  // PackageModel has no supportsImages column — reuse the PAYG AIModel row
  // with the same modelId as the capability source.
  const aiModels = await prisma.aIModel.findMany({
    where: { modelId: { in: models.map((m) => m.modelId) } },
    select: { modelId: true, supportsImages: true },
  });
  const imageCapable = new Map(aiModels.map((m) => [m.modelId, m.supportsImages]));
  const now = Math.floor(Date.now() / 1000);
  return Response.json({
    object: "list",
    data: models.map((model) => ({
      id: model.modelId,
      object: "model",
      created: now,
      owned_by: model.provider,
      // OpenRouter-style capability metadata so clients that parse it can
      // enable image input without any manual configuration.
      architecture: {
        input_modalities: imageCapable.get(model.modelId) ? ["text", "image"] : ["text"],
        output_modalities: ["text"],
      },
    })),
  }, { headers: cors });
}
