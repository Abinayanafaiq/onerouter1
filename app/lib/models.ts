import { prisma } from "./prisma";
import type { AIModel } from "@prisma/client";

export type AIModelWithPricing = AIModel;

export async function getAllModels(): Promise<AIModel[]> {
  return prisma.aIModel.findMany({
    orderBy: { sort: "asc" },
  });
}

/** Enabled models (includes those in maintenance mode). Used by the pricing
 *  table and admin views where the maintenance indicator is shown. */
export async function getEnabledModels(): Promise<AIModel[]> {
  return prisma.aIModel.findMany({
    where: { enabled: true },
    orderBy: { sort: "asc" },
  });
}

/** Models that are enabled AND not in maintenance mode. Used by user-facing
 *  selectors: Chat Playground, /v1/models, API key allowed-models, dashboard. */
export async function getAvailableModels(): Promise<AIModel[]> {
  return prisma.aIModel.findMany({
    where: { enabled: true, maintenanceMode: false },
    orderBy: { sort: "asc" },
  });
}

export async function getModelByModelId(modelId: string): Promise<AIModel | null> {
  return prisma.aIModel.findUnique({ where: { modelId } });
}

export type ResolvedModel = {
  id: string;
  modelId: string;
  masterId: string;
  name: string;
  provider: string;
  contextWindow: string | null;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  supportsText: boolean;
  supportsImages: boolean;
  supportsStreaming: boolean;
  enabled: boolean;
  maintenanceMode: boolean;
};

export async function resolveModel(model: string): Promise<ResolvedModel | null> {
  // Try direct match by modelId
  let aiModel = await prisma.aIModel.findUnique({ where: { modelId: model } });

  // Try matching by masterId
  if (!aiModel) {
    aiModel = await prisma.aIModel.findFirst({ where: { masterId: model } });
  }

  if (!aiModel) return null;

  return {
    id: aiModel.id,
    modelId: aiModel.modelId,
    masterId: aiModel.masterId,
    name: aiModel.name,
    provider: aiModel.provider,
    contextWindow: aiModel.contextWindow,
    inputPricePerMillion: Number(aiModel.inputPricePerMillion),
    outputPricePerMillion: Number(aiModel.outputPricePerMillion),
    supportsText: aiModel.supportsText,
    supportsImages: aiModel.supportsImages,
    supportsStreaming: aiModel.supportsStreaming,
    enabled: aiModel.enabled,
    maintenanceMode: aiModel.maintenanceMode,
  };
}

export async function updateModel(
  id: string,
  data: {
    name?: string;
    provider?: string;
    modelId?: string;
    contextWindow?: string | null;
    inputPricePerMillion?: number;
    outputPricePerMillion?: number;
    supportsText?: boolean;
    supportsImages?: boolean;
    supportsStreaming?: boolean;
    enabled?: boolean;
    maintenanceMode?: boolean;
    sort?: number;
    description?: string | null;
  },
): Promise<AIModel | null> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.provider !== undefined) updateData.provider = data.provider;
  if (data.modelId !== undefined) updateData.modelId = data.modelId;
  if (data.contextWindow !== undefined) updateData.contextWindow = data.contextWindow;
  if (data.inputPricePerMillion !== undefined)
    updateData.inputPricePerMillion = data.inputPricePerMillion;
  if (data.outputPricePerMillion !== undefined)
    updateData.outputPricePerMillion = data.outputPricePerMillion;
  if (data.supportsText !== undefined) updateData.supportsText = data.supportsText;
  if (data.supportsImages !== undefined) updateData.supportsImages = data.supportsImages;
  if (data.supportsStreaming !== undefined) updateData.supportsStreaming = data.supportsStreaming;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.maintenanceMode !== undefined) updateData.maintenanceMode = data.maintenanceMode;
  if (data.sort !== undefined) updateData.sort = data.sort;
  if (data.description !== undefined) updateData.description = data.description;

  try {
    return await prisma.aIModel.update({ where: { id }, data: updateData });
  } catch (e) {
    // Prisma throws P2025 when the record is not found. Return null so
    // callers can produce a proper 404 instead of a generic 500.
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2025"
    ) {
      return null;
    }
    throw e;
  }
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePerMillion: number,
  outputPricePerMillion: number,
): { inputCost: number; outputCost: number; totalCost: number } {
  const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion;
  const totalCost = inputCost + outputCost;
  return { inputCost, outputCost, totalCost };
}
