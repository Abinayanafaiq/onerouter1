import { getAllModels } from "@/app/lib/models";
import { ModelEditor } from "./model-editor";

export default async function AdminModelsPage() {
  const models = await getAllModels();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Model &amp; Pricing</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Atur metadata, harga per 1 juta token, status model &amp; maintenance mode
        </p>
      </div>

      <div className="space-y-3">
        {models.map((m) => (
          <ModelEditor
            key={m.id}
            model={{
              id: m.id,
              modelId: m.modelId,
              name: m.name,
              provider: m.provider,
              description: m.description,
              contextWindow: m.contextWindow,
              inputPricePerMillion: Number(m.inputPricePerMillion),
              outputPricePerMillion: Number(m.outputPricePerMillion),
              supportsText: m.supportsText,
              supportsImages: m.supportsImages,
              supportsStreaming: m.supportsStreaming,
              enabled: m.enabled,
              maintenanceMode: m.maintenanceMode,
              sort: m.sort,
            }}
          />
        ))}
      </div>
    </div>
  );
}
