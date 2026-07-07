import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { maskKey } from "@/app/lib/apikey";
import Link from "next/link";
import { UploadProof } from "./upload-proof";
import { RevealKey } from "./reveal-key";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const [orders, apiKeys, aggReq, aggToken] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: { package: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.apiKey.aggregate({
      where: { userId },
      _sum: { requestCount: true },
    }),
    prisma.apiKey.aggregate({
      where: { userId },
      _sum: { tokenUsed: true },
    }),
  ]);

  const hasActiveKey = apiKeys.some((k) => k.isActive && new Date(k.expiresAt) > new Date());
  const totalReq = aggReq._sum.requestCount || 0;
  const totalTokens = Number(aggToken._sum.tokenUsed || 0);

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

      {/* Stats row - minimal */}
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Status" value={hasActiveKey ? "Aktif" : "—"} accent={hasActiveKey ? "text-green-500" : ""} />
        <Stat label="Request" value={totalReq.toLocaleString("id-ID")} />
        <Stat label="Token" value={`${(totalTokens / 1_000_000).toFixed(1)}J`} />
        <Stat label="Order" value={String(orders.filter((o) => o.status === "APPROVED").length)} />
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
              const pct = Number(key.tokenQuota) > 0
                ? Math.min(100, Math.round((Number(key.tokenUsed) / Number(key.tokenQuota)) * 100))
                : 0;
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
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>
                      {(Number(key.tokenUsed) / 1_000_000).toFixed(1)}/{(Number(key.tokenQuota) / 1_000_000).toFixed(0)}Jt
                    </span>
                    <span>{key.requestCount.toLocaleString("id-ID")} req</span>
                    <span>s/d {key.expiresAt.toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="w-full h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : "bg-foreground"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {/* Endpoint info - collapsible feel */}
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">Endpoint:</p>
              <code className="text-xs font-mono block break-all">
                {process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com"}/v1/chat/completions
              </code>
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border rounded-lg p-2.5 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accent || ""}`}>{value}</div>
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
