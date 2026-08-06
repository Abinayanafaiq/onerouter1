import { getTranslations } from "next-intl/server";
import { auth } from "@/app/lib/auth";
import { listApiKeys } from "@/app/lib/api-keys";
import { getApiRequestFilterOptions } from "@/app/lib/api-request-log";
import { getAvailableModels } from "@/app/lib/models";
import { ApiKeyManager } from "./api-key-manager";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const session = await auth();
  const t = await getTranslations("ApiKeys");
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const [keys, filterOptions, models] = await Promise.all([
    listApiKeys(userId),
    getApiRequestFilterOptions(userId),
    getAvailableModels(),
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("subtitle")}
        </p>
      </div>
      <ApiKeyManager
        initialKeys={keys}
        modelOptions={filterOptions.models}
        providerOptions={filterOptions.providers}
        enabledModels={models.map((m) => m.modelId)}
      />
    </div>
  );
}
