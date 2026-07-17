import { getAllModels } from "@/app/lib/models";
import { ModelEditor } from "./model-editor";
import { getAllPackageModels } from "@/app/lib/package-models";
import { PackageModelEditor } from "./package-model-editor";

export default async function AdminModelsPage() {
  const [models, packageModels] = await Promise.all([getAllModels(), getAllPackageModels()]);

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

      <div className="border-t border-neutral-800 pt-6">
        <h2 className="text-lg font-bold text-neutral-100">Model Paket Token</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Katalog terpisah untuk endpoint /v1/package. ID publik tidak memakai prefix wz/.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {packageModels.map((model) => (
          <PackageModelEditor
            key={model.id}
            model={{
              id: model.id,
              modelId: model.modelId,
              upstreamId: model.upstreamId,
              name: model.name,
              provider: model.provider,
              enabled: model.enabled,
              supportsStreaming: model.supportsStreaming,
            }}
          />
        ))}
      </div>
    </div>
  );
}
