/**
 * Server-safe model card data shape + mapper.
 *
 * Kept in a module WITHOUT "use client" so that Server Components can import
 * and call `toModelCardData` directly, while Client Components can import the
 * `ModelCardData` type. Prisma Decimal values are normalized to plain numbers
 * here so they are serializable when passed as props to Client Components.
 */
export type ModelCardData = {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  description: string | null;
  contextWindow: string | null;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  supportsText: boolean;
  supportsImages: boolean;
  supportsStreaming: boolean;
  maintenanceMode: boolean;
};

function toNum(
  v: number | { toNumber?: () => number } | string | null | undefined,
): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && typeof v.toNumber === "function") return v.toNumber();
  if (typeof v === "string") return Number(v);
  return 0;
}

export function toModelCardData(m: {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  description: string | null;
  contextWindow: string | null;
  inputPricePerMillion: number | { toNumber?: () => number } | string;
  outputPricePerMillion: number | { toNumber?: () => number } | string;
  supportsText: boolean;
  supportsImages: boolean;
  supportsStreaming: boolean;
  maintenanceMode: boolean;
}): ModelCardData {
  return {
    id: m.id,
    modelId: m.modelId,
    name: m.name,
    provider: m.provider,
    description: m.description,
    contextWindow: m.contextWindow,
    inputPricePerMillion: toNum(m.inputPricePerMillion),
    outputPricePerMillion: toNum(m.outputPricePerMillion),
    supportsText: m.supportsText,
    supportsImages: m.supportsImages,
    supportsStreaming: m.supportsStreaming,
    maintenanceMode: m.maintenanceMode,
  };
}
