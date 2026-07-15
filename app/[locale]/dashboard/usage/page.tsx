import { auth } from "@/app/lib/auth";
import { getUsageFilterOptions } from "@/app/lib/usage-stats";
import { UsageAnalytics } from "./usage-analytics";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const options = await getUsageFilterOptions(userId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">Usage Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pantau konsumsi kredit & riwayat pemakaian AI kamu
        </p>
      </div>
      <UsageAnalytics
        modelOptions={options.models}
        providerOptions={options.providers}
      />
    </div>
  );
}
