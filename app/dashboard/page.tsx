import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getOrCreateWallet, getTransactions } from "@/app/lib/wallet";
import { getAvailableModels } from "@/app/lib/models";
import { TOKS_LABEL, idrToToks } from "@/app/lib/constants";
import Link from "next/link";
import { UploadProof } from "./upload-proof";
import { RevealKey } from "./reveal-key";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const wallet = await getOrCreateWallet(userId);
  const recentTransactions = await getTransactions(wallet.id, 10);
  const enabledModels = await getAvailableModels();

  const orders = await prisma.order.findMany({
    where: { userId },
    include: { package: true },
    orderBy: { createdAt: "desc" },
  });
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const totalUsageCost = await prisma.usageLog.aggregate({
    where: { userId },
    _sum: { totalCost: true },
  });
  const totalRequests = await prisma.usageLog.count({ where: { userId } });

  const balance = Number(wallet.balance);
  const totalSpent = Number(totalUsageCost._sum.totalCost || 0);

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
        <div className="flex gap-2">
          <Link
            href="/dashboard/chat"
            className="border px-3 py-1.5 rounded-md text-xs font-medium hover:bg-muted transition"
          >
            Chat Playground
          </Link>
          <Link
            href="/dashboard/wallet"
            className="bg-foreground text-background px-3 py-1.5 rounded-md text-xs font-medium hover:opacity-90 transition"
          >
            + Top Up
          </Link>
        </div>
      </div>

      {/* Wallet Balance - prominent */}
      <div className="border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Wallet Balance</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            balance > 0 ? "bg-green-500/15 text-green-500" : "bg-gray-500/15 text-gray-500"
          }`}>
            {balance > 0 ? "● Active" : "● No Balance"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Saldo Kredit</div>
            <div className="text-2xl font-bold mt-0.5 text-green-500">
              {idrToToks(balance).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {TOKS_LABEL} · ≈ Rp{balance.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Terpakai</div>
            <div className="text-2xl font-bold mt-0.5">
              {idrToToks(totalSpent).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
            </div>
            <div className="text-[10px] text-muted-foreground">{TOKS_LABEL} biaya AI</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Request</div>
            <div className="text-2xl font-bold mt-0.5">{totalRequests.toLocaleString("id-ID")}</div>
            <div className="text-[10px] text-muted-foreground">API calls</div>
          </div>
        </div>
        {balance <= 0 && (
          <div className="mt-4 border border-yellow-500/30 bg-yellow-500/10 rounded-md p-3 text-xs text-yellow-600">
            Kredit {TOKS_LABEL} habis. <Link href="/dashboard/wallet" className="font-medium underline">Top up sekarang</Link> untuk mulai pakai AI.
          </div>
        )}
      </div>

      {/* Available Models */}
      <div className="border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Model Tersedia</h2>
        <div className="space-y-2">
          {enabledModels.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{m.name}</span>
                <code className="ml-2 text-xs text-muted-foreground">{m.modelId}</code>
              </div>
              <div className="text-xs text-muted-foreground">
                In: Rp{Number(m.inputPricePerMillion).toLocaleString("id-ID")}/Jt ·
                Out: Rp{Number(m.outputPricePerMillion).toLocaleString("id-ID")}/Jt
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">API Keys</h2>
          <Link href="/dashboard/api-keys" className="text-xs text-muted-foreground hover:text-foreground transition">
            Manage all →
          </Link>
        </div>
        {apiKeys.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No API keys yet.{" "}
              <Link href="/dashboard/api-keys" className="font-medium hover:underline">Generate one</Link>{" "}
              to start using the API.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((key) => {
              const isExpired = key.expiresAt ? new Date(key.expiresAt) <= new Date() : false;
              const rawKey = key.key ?? "";
              return (
                <div key={key.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <RevealKey rawKey={rawKey} isExpired={isExpired} />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      isExpired ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
                    }`}>
                      {isExpired ? "Expired" : "Active"}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    Berlaku s/d {key.expiresAt ? key.expiresAt.toLocaleDateString("id-ID") : "no expiry"} · {key.requestCount.toLocaleString("id-ID")} request
                  </div>
                </div>
              );
            })}

            {/* Usage Instructions */}
            <div className="border rounded-lg p-4 bg-muted/20 mt-3">
              <h3 className="text-sm font-medium mb-3">Cara Pakai API</h3>
              <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                <li>Dapatkan API key di atas (klik <span className="font-medium text-foreground">Show</span> lalu <span className="font-medium text-foreground">Copy</span>)</li>
                <li>Pastikan <Link href="/dashboard/wallet" className="font-medium text-foreground hover:underline">wallet balance</Link> cukup</li>
                <li>Set base URL ke <code className="bg-background border rounded px-1.5 py-0.5 font-mono text-foreground">https://www.onerouter.my.id/v1</code></li>
                <li>Set Authorization header: <code className="bg-background border rounded px-1.5 py-0.5 font-mono text-foreground">Bearer sk_live_xxx</code></li>
                <li>Pilih model: {enabledModels.map((m) => (
                  <code key={m.id} className="bg-background border rounded px-1.5 py-0.5 font-mono text-foreground mr-1">{m.modelId}</code>
                ))}</li>
              </ol>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Contoh cURL:</p>
                <pre className="text-[10px] font-mono bg-background border rounded px-2 py-2 overflow-x-auto leading-relaxed">
{`curl https://www.onerouter.my.id/v1/chat/completions \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${enabledModels[0]?.modelId ?? "glm-5.2"}",
    "messages": [
      {"role": "user", "content": "Halo!"}
    ]
  }'`}
                </pre>
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Billing per request (dari response <code className="font-mono">x_billing</code>):</p>
                <pre className="text-[10px] font-mono bg-background border rounded px-2 py-2 overflow-x-auto">
{`"x_billing": {
  "inputTokens": 10,
  "outputTokens": 25,
  "totalTokens": 35,
  "inputCost": 0.01,
  "outputCost": 0.075,
  "totalCost": 0.085,
  "remainingBalance": 9999.92
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Transaksi Terbaru</h2>
          <Link href="/dashboard/wallet" className="text-xs text-muted-foreground hover:text-foreground transition">
            Semua →
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {recentTransactions.map((t) => {
              const amt = Number(t.amount);
              const isPositive = amt > 0;
              return (
                <div key={t.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{t.type}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                  </div>
                  <div className={`text-sm font-mono shrink-0 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? "+" : "-"}{idrToToks(Math.abs(amt)).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })} {TOKS_LABEL}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Orders */}
      <section>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Orders</h2>
        {orders.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada transaksi.{" "}
              <Link href="/dashboard/wallet" className="font-medium hover:underline">Top up kredit</Link>
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
                  {o.status === "PENDING" && (o.paymentMethod === "CRYPTO" || o.paymentMethod === "PAKASIR") && (
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
