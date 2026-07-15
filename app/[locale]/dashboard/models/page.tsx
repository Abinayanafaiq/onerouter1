import { getAvailableModels } from "@/app/lib/models";
import { toModelCardData } from "@/app/lib/model-card-data";
import { ModelsMarketplace } from "./models-marketplace";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const availableModels = await getAvailableModels();
  const models = availableModels.map(toModelCardData);
  const providers = Array.from(new Set(models.map((m) => m.provider))).sort();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Model Marketplace</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Production-ready LLMs behind a single OpenAI-compatible endpoint. Pick by capability,
          context, or price.
        </p>
      </header>

      <div className="animate-fade-up-delay-1">
        <ModelsMarketplace models={models} providers={providers} />
      </div>
    </div>
  );
}
