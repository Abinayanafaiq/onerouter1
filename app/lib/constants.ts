export const MASTER_API_URL = process.env.MASTER_API_URL || "https://ai.prokuy.com/v1";
export const MASTER_API_KEY = process.env.MASTER_API_KEY || "";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@onerouter.id";

export const APP_NAME = "OneRouter";
export const APP_TAGLINE = "Token AI Murah - Multi Model Premium";

export const SUPPORTED_MODELS = [
  {
    id: "glm-5.2",
    masterId: "prokuy/glm-5.2",
    name: "GLM-5.2",
    description: "Model serbaguna cepat, cocok untuk chat harian & general task",
    contextWindow: "1M",
  },
  {
    id: "deepseek-v4-pro",
    masterId: "prokuy/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    description: "Coding & reasoning kelas atas, harga terjangkau",
    contextWindow: "1M",
  },
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

export function mapModelToMaster(model: string): string | null {
  const found = SUPPORTED_MODELS.find((m) => m.id === model);
  if (found) return found.masterId;
  if (model.startsWith("prokuy/")) return model;
  const byMaster = SUPPORTED_MODELS.find((m) => m.masterId === model);
  if (byMaster) return byMaster.masterId;
  return null;
}

export function isValidModel(model: string): boolean {
  return SUPPORTED_MODELS.some((m) => m.id === model || m.masterId === model);
}
