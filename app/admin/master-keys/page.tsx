import { listMasterApiKeys } from "@/app/lib/master-api-keys";
import { getAuditLogs } from "@/app/lib/audit-log";
import { MasterKeysManager } from "./master-keys-manager";

export const dynamic = "force-dynamic";

export default async function AdminMasterKeysPage() {
  const [keys, auditLogs] = await Promise.all([
    listMasterApiKeys(),
    getAuditLogs(50),
  ]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Master API Keys</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Kelola master key upstream dengan failover otomatis. Key dienkripsi AES-256-GCM di database.
        </p>
      </div>
      <MasterKeysManager initialKeys={keys} initialAuditLogs={auditLogs} />
    </div>
  );
}
