import { prisma } from "./prisma";
import { hashKey } from "./apikey";
import { mapModelToMaster } from "./constants";

export async function authenticateRequest(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const key = authHeader.slice(7).trim();
  if (!key) return null;

  const keyHash = hashKey(key);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) return null;
  if (!apiKey.isActive) return null;
  if (new Date(apiKey.expiresAt) <= new Date()) return null;
  if (Number(apiKey.tokenUsed) >= Number(apiKey.tokenQuota)) return null;

  return apiKey;
}

export function resolveMasterModel(model: string): string | null {
  return mapModelToMaster(model);
}

export async function recordUsage(
  apiKeyId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
) {
  const totalTokens = promptTokens + completionTokens;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) return;

  const lastReset = new Date(apiKey.lastResetDay);
  lastReset.setHours(0, 0, 0, 0);
  const resetToday = lastReset.getTime() !== today.getTime();

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      tokenUsed: { increment: BigInt(totalTokens) },
      requestCount: { increment: 1 },
      requestToday: resetToday ? 1 : { increment: 1 },
      lastRequestAt: new Date(),
      lastResetDay: resetToday ? today : undefined,
    },
  });

  await prisma.usageLog.create({
    data: {
      apiKeyId,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
    },
  });
}

export function errorResponse(
  message: string,
  status: number,
  type = "invalid_request_error",
) {
  return Response.json(
    {
      error: {
        message,
        type,
        param: null,
        code: null,
      },
    },
    { status },
  );
}
