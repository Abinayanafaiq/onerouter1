import { authenticateRequest, errorResponse } from "@/app/lib/proxy-utils";
import { SUPPORTED_MODELS } from "@/app/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const apiKey = await authenticateRequest(request.headers.get("authorization"));
  if (!apiKey) {
    return errorResponse("Invalid API key", 401, "authentication_error");
  }

  const now = Math.floor(Date.now() / 1000);
  return Response.json({
    object: "list",
    data: SUPPORTED_MODELS.map((m) => ({
      id: m.id,
      object: "model",
      created: now,
      owned_by: "onerouter",
    })),
  }, { headers: corsHeaders() });
}
