import { authenticateRequest, errorResponse } from "@/app/lib/proxy-utils";
import { SUPPORTED_MODELS } from "@/app/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  });
}