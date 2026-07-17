/**
 * Centralized provider-to-model mapping.
 *
 * Single source of truth for which provider owns which model IDs. Reused by:
 *   - Seed script (prisma/seed-models.ts)
 *   - Chat Playground & model selectors
 *   - API endpoints (OpenAI-compatible routing)
 *   - Billing engine
 *   - Analytics & dashboard statistics
 *   - Admin dashboard
 *
 * The database (AIModel.provider) remains the authoritative runtime source —
 * this constant is used for seeding, validation, display grouping, and
 * resolving the upstream provider when a model is requested.
 */

export const PROVIDER_MODEL_MAP = {
  Alibaba: ["qwen3.7-plus", "qwen3-coder-next"],
  DeepSeek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  GLM: ["glm-5.1", "glm-5.2", "glm-5.2-fast"],
  MiniMax: ["minimax-m3"],
  "Moonshot AI": ["kimi-k2.7-code", "kimi-k2.7-code-fast", "kimi-k3"],
  Xiaomi: ["mimo-v2.5-pro"],
} as const;

export type ProviderName = keyof typeof PROVIDER_MODEL_MAP;

/** All known provider names. */
export const ALL_PROVIDERS = Object.keys(PROVIDER_MODEL_MAP) as ProviderName[];

/** Flatten every known model ID from the mapping. */
export const ALL_KNOWN_MODEL_IDS: string[] = ALL_PROVIDERS.flatMap(
  (p) => PROVIDER_MODEL_MAP[p],
);

/** Reverse lookup: modelId → provider. Returns null for unknown models. */
export function getProviderForModel(modelId: string): string | null {
  for (const provider of ALL_PROVIDERS) {
    if (PROVIDER_MODEL_MAP[provider].includes(modelId as never)) {
      return provider;
    }
  }
  return null;
}

/** All model IDs that belong to a given provider. */
export function getModelsByProvider(provider: string): string[] {
  if (provider in PROVIDER_MODEL_MAP) {
    return [...PROVIDER_MODEL_MAP[provider as ProviderName]];
  }
  return [];
}

/** Whether a model ID is recognized in the provider mapping. */
export function isKnownModel(modelId: string): boolean {
  return getProviderForModel(modelId) !== null;
}

/**
 * Default model metadata used during seeding. Prices default to 0 so admins
 * can configure them from the dashboard. The runtime always reads prices from
 * the database — never from this table.
 */
export type ModelSeedMeta = {
  modelId: string;
  masterId: string;
  name: string;
  provider: string;
  description: string;
  contextWindow: string;
  supportsText: boolean;
  supportsImages: boolean;
  supportsStreaming: boolean;
  sort: number;
};

export const MODEL_SEED_DATA: ModelSeedMeta[] = [
  {
    modelId: "glm-5.2",
    masterId: "glm-5.2",
    name: "GLM-5.2",
    provider: "GLM",
    description: "Model serbaguna cepat, cocok untuk chat harian & general task",
    contextWindow: "1M",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 1,
  },
  {
    modelId: "deepseek-v4-pro",
    masterId: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    description: "Coding & reasoning kelas atas, harga terjangkau",
    contextWindow: "1M",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 2,
  },
  {
    modelId: "qwen3.7-plus",
    masterId: "qwen3.7-plus",
    name: "Qwen 7 Plus",
    provider: "Alibaba",
    description: "Qwen 7 Plus — versatile model for chat and general tasks",
    contextWindow: "200K",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 3,
  },
  {
    modelId: "deepseek-v4-flash",
    masterId: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    description: "DeepSeek V4 Flash — fast and efficient for high-throughput tasks",
    contextWindow: "1M",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 4,
  },
  {
    modelId: "glm-5.1",
    masterId: "glm-5.1",
    name: "GLM 5.1",
    provider: "GLM",
    description: "GLM 5.1 — balanced model for everyday AI workloads",
    contextWindow: "200K",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 5,
  },
  {
    modelId: "glm-5.2-fast",
    masterId: "glm-5.2-fast",
    name: "GLM 5.2 Fast",
    provider: "GLM",
    description: "GLM 5.2 Fast — ultra-low-latency variant with 1M context",
    contextWindow: "1M",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 6,
  },
  {
    modelId: "qwen3-coder-next",
    masterId: "qwen3-coder-next",
    name: "Qwen3 Coder Next",
    provider: "Alibaba",
    description: "Qwen3 Coder Next — specialized for code generation & completion",
    contextWindow: "200K",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 7,
  },
  {
    modelId: "minimax-m3",
    masterId: "minimax-m3",
    name: "MiniMax M3",
    provider: "MiniMax",
    description: "MiniMax M3 — large-context model for complex reasoning",
    contextWindow: "1M",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 8,
  },
  {
    modelId: "kimi-k2.7-code",
    masterId: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    provider: "Moonshot AI",
    description: "Kimi K2.7 Code — long-context coding assistant by Moonshot AI",
    contextWindow: "250K",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 9,
  },
  {
    modelId: "kimi-k2.7-code-fast",
    masterId: "kimi-k2.7-code-fast",
    name: "Kimi K2.7 Code Fast",
    provider: "Moonshot AI",
    description: "Kimi K2.7 Code Fast — faster Moonshot AI coding model",
    contextWindow: "250K",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 10,
  },
  {
    modelId: "kimi-k3",
    masterId: "kimi-k3",
    name: "Kimi K3",
    provider: "Moonshot AI",
    description: "Kimi K3 oleh Moonshot AI untuk reasoning dan general task",
    contextWindow: "256K",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 11,
  },
  {
    modelId: "mimo-v2.5-pro",
    masterId: "mimo-v2.5-pro",
    name: "MiMo V2.5 Pro",
    provider: "Xiaomi",
    description: "MiMo V2.5 Pro oleh Xiaomi untuk reasoning dan coding",
    contextWindow: "256K",
    supportsText: true,
    supportsImages: false,
    supportsStreaming: true,
    sort: 12,
  },
];
