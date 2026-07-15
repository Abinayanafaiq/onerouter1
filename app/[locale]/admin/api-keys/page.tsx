import { listAllApiKeys, getAdminKeyAnalytics } from "@/app/lib/admin-api-keys";
import { AdminApiKeysClient } from "./api-keys-client";

export const dynamic = "force-dynamic";

export default async function AdminApiKeysPage() {
  const [keys, analytics] = await Promise.all([
    listAllApiKeys(),
    getAdminKeyAnalytics(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">API Keys</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Monitor all user API keys, usage, revenue &amp; abuse
        </p>
      </div>
      <AdminApiKeysClient keys={keys} analytics={analytics} />
    </div>
  );
}
