import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import Link from "next/link";
import { UploadProof } from "./upload-proof";
import { RevealKey } from "./reveal-key";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const orders = await prisma.order.findMany({
    where: { userId },
    include: { package: true },
    orderBy: { createdAt: "desc" },
  });
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const aggReq = await prisma.apiKey.aggregate({
    where: { userId },
    _sum: { requestCount: true },
  });
  const aggToken = await prisma.apiKey.aggregate({
    where: { userId },
    _sum: { tokenUsed: true },
  });
  const aggQuota = await prisma.apiKey.aggregate({
    where: { userId },
    _sum: { tokenQuota: true },
  });

  const hasActiveKey = apiKeys.some((k) => k.isActive && new Date(k.expiresAt) > new Date());
  const totalReq = aggReq._sum.requestCount || 0;
  const totalUsed = Number(aggToken._sum.tokenUsed || 0);
  const totalQuota = Number(aggQuota._sum.tokenQuota || 0);
  const totalRemaining = Math.max(0, totalQuota - totalUsed);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {session?.user?.email}
          </p>
        </div>
        <Link
          href="/pricing"
          className="bg-foreground text-background px-3 py-1.5 rounded-md text-xs font-medium hover:opacity-90 transition"
        >
          + Beli Paket
        </Link>
      </div>

      {/* Token Usage - prominent */}
      <div className="border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Token Usage</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            hasActiveKey ? "bg-green-500/15 text-green-500" : "bg-gray-500/15 text-gray-500"
          }`}>
            {hasActiveKey ? "● Active" : "● No Active Key"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Terpakai</div>
            <div className="text-2xl font-bold mt-0.5">{(totalUsed / 1_000_000).toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">Juta token</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Sisa</div>
            <div className="text-2xl font-bold mt-0.5 text-green-500">{(totalRemaining / 1_000_000).toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">Juta token</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Request</div>
            <div className="text-2xl font-bold mt-0.5">{totalReq.toLocaleString("id-ID")}</div>
            <div className="text-[10px] text-muted-foreground">API calls</div>
          </div>
        </div>
        {totalQuota > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{((totalUsed / totalQuota) * 100).toFixed(1)}% terpakai</span>
              <span>{((totalRemaining / totalQuota) * 100).toFixed(1)}% sisa</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (totalUsed / totalQuota) * 100 > 80 ? "bg-red-500" : "bg-foreground"
                }`}
                style={{ width: `${Math.min(100, (totalUsed / totalQuota) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* API Keys */}
      <section>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">API Keys</h2>
        {apiKeys.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada API key.{" "}
              <Link href="/pricing" className="font-medium hover:underline">Beli paket</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((key) => {
              const isExpired = new Date(key.expiresAt) <= new Date();
              const used = Number(key.tokenUsed);
              const quota = Number(key.tokenQuota);
              const remaining = Math.max(0, quota - used);
              const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
              return (
                <div key={key.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <RevealKey rawKey={key.key} isExpired={isExpired} />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      isExpired ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
                    }`}>
                      {isExpired ? "Expired" : "Active"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Terpakai</span>
                      <span className="font-bold">{(used / 1_000_000).toFixed(2)}Jt</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Sisa</span>
                      <span className="font-bold text-green-500">{(remaining / 1_000_000).toFixed(2)}Jt</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Request</span>
                      <span className="font-bold">{key.requestCount.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : "bg-foreground"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    Berlaku s/d {key.expiresAt.toLocaleDateString("id-ID")}
                  </div>
                </div>
              );
            })}

            {/* Usage Instructions */}
            <div className="border rounded-lg p-4 bg-muted/20 mt-3">
              <h3 className="text-sm font-medium mb-3">📖 Cara Pakai API</h3>
              <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                <li>Dapatkan API key di atas (klik <span className="font-medium text-foreground">Show</span> lalu <span className="font-medium text-foreground">Copy</span>)</li>
                <li>Set base URL ke <code className="bg-background border rounded px-1.5 py-0.5 font-mono text-foreground">https://www.onerouter.my.id/v1</code></li>
                <li>Set Authorization header: <code className="bg-background border rounded px-1.5 py-0.5 font-mono text-foreground">Bearer sk_live_xxx</code></li>
                <li>Pilih model: <code className="bg-background border rounded px-1.5 py-0.5 font-mono text-foreground">glm-5.2</code>, <code className="bg-background border rounded px-1.5 py-0.5 font-mono text-foreground">deepseek-v4-pro</code></li>
              </ol>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Contoh cURL:</p>
                <pre className="text-[10px] font-mono bg-background border rounded px-2 py-2 overflow-x-auto leading-relaxed">
{`curl https://www.onerouter.my.id/v1/chat/completions \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "glm-5.2",
    "messages": [
      {"role": "user", "content": "Halo!"}
    ]
  }'`}
                </pre>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Python (OpenAI SDK):</p>
                <pre className="text-[10px] font-mono bg-background border rounded px-2 py-2 overflow-x-auto leading-relaxed">
{`from openai import OpenAI

client = OpenAI(
    base_url="https://www.onerouter.my.id/v1",
    api_key="sk_live_xxx"
)

resp = client.chat.completions.create(
    model="glm-5.2",
    messages=[{"role": "user", "content": "Halo!"}]
)
print(resp.choices[0].message.content)`}
                </pre>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">JavaScript (OpenAI SDK):</p>
                <pre className="text-[10px] font-mono bg-background border rounded px-2 py-2 overflow-x-auto leading-relaxed">
{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://www.onerouter.my.id/v1",
  apiKey: "sk_live_xxx"
});

const resp = await client.chat.completions.create({
  model: "glm-5.2",
  messages: [{ role: "user", content: "Halo!" }]
});
console.log(resp.choices[0].message.content);`}
                </pre>
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Cek sisa token via API:</p>
                <pre className="text-[10px] font-mono bg-background border rounded px-2 py-2 overflow-x-auto">
{`GET https://www.onerouter.my.id/v1/models
Authorization: Bearer sk_live_xxx`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Orders */}
      <section>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Orders</h2>
        {orders.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada order.{" "}
              <Link href="/pricing" className="font-medium hover:underline">Lihat paket</Link>
            </p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {orders.map((o) => (
              <div key={o.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{o.package.name}</span>
                    <StatusDot status={o.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Rp{o.amount.toLocaleString("id-ID")} · {o.paymentMethod} · {o.createdAt.toLocaleDateString("id-ID")}
                  </div>
                </div>
                <div className="shrink-0">
                  {o.status === "PENDING" && o.paymentMethod === "MANUAL" && (
                    <UploadProof orderId={o.id} />
                  )}
                  {o.status === "PENDING" && o.paymentMethod === "CRYPTO" && (
                    <Link
                      href={`/checkout/${o.packageId}`}
                      className="border px-2 py-1 rounded text-xs hover:bg-muted transition"
                    >
                      Bayar
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    PENDING: { color: "bg-yellow-500", label: "Pending" },
    APPROVED: { color: "bg-green-500", label: "Aktif" },
    REJECTED: { color: "bg-red-500", label: "Ditolak" },
    CANCELLED: { color: "bg-gray-400", label: "Batal" },
  };
  const s = map[status] || { color: "bg-gray-400", label: status };
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
      {s.label}
    </span>
  );
}
