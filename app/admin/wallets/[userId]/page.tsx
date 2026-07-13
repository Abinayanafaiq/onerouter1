import { prisma } from "@/app/lib/prisma";
import { notFound } from "next/navigation";
import { getOrCreateWallet, getTransactions } from "@/app/lib/wallet";
import Link from "next/link";
import { WalletAdjustForm } from "./adjust-form";
import { RateLimitForm } from "./rate-limit-form";
import { WhatsAppForm } from "./whatsapp-form";

export default async function AdminWalletDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, whatsapp: true, rateLimit: true },
  });
  if (!user) notFound();

  const wallet = await getOrCreateWallet(userId);
  const transactions = await getTransactions(wallet.id, 100);

  // Get usage stats for this user
  const usageAgg = await prisma.usageLog.aggregate({
    where: { userId },
    _sum: { totalCost: true, inputTokens: true, outputTokens: true },
    _count: true,
  });

  const balance = Number(wallet.balance);
  const totalSpent = Number(usageAgg._sum.totalCost || 0);
  const totalInput = usageAgg._sum.inputTokens || 0;
  const totalOutput = usageAgg._sum.outputTokens || 0;
  const totalRequests = usageAgg._count || 0;

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Link href="/admin/wallets" className="text-xs text-neutral-500 hover:text-neutral-300 transition">
          ← Wallet Users
        </Link>
        <h1 className="text-xl font-bold text-neutral-100 mt-2">{user.email}</h1>
        {user.name && <p className="text-xs text-neutral-500 mt-0.5">{user.name}</p>}
      </div>

      {/* Stats */}
      <div className="border border-neutral-800 rounded-lg bg-neutral-900 divide-y divide-neutral-800">
        <div className="p-3 flex justify-between">
          <span className="text-neutral-500 text-sm">Saldo Saat Ini</span>
          <span className="font-bold text-green-400">
            Rp{balance.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-3 flex justify-between">
          <span className="text-neutral-500 text-sm">Total Terpakai</span>
          <span className="font-medium text-neutral-200">
            Rp{totalSpent.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-3 flex justify-between">
          <span className="text-neutral-500 text-sm">Total Request</span>
          <span className="font-medium text-neutral-200">{totalRequests.toLocaleString("id-ID")}</span>
        </div>
        <div className="p-3 flex justify-between">
          <span className="text-neutral-500 text-sm">Input Tokens</span>
          <span className="font-medium text-neutral-200">{totalInput.toLocaleString("id-ID")}</span>
        </div>
        <div className="p-3 flex justify-between">
          <span className="text-neutral-500 text-sm">Output Tokens</span>
          <span className="font-medium text-neutral-200">{totalOutput.toLocaleString("id-ID")}</span>
        </div>
      </div>

      {/* WhatsApp */}
      <WhatsAppForm userId={userId} currentWhatsApp={user.whatsapp} />

      {/* Rate limit */}
      <RateLimitForm userId={userId} currentLimit={user.rateLimit} />

      {/* Adjust balance */}
      <WalletAdjustForm userId={userId} currentBalance={balance} />

      {/* Transactions */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-2">Riwayat Transaksi</h2>
        {transactions.length === 0 ? (
          <div className="border border-neutral-800 rounded-lg p-4 text-center text-neutral-500 text-sm">
            Belum ada transaksi
          </div>
        ) : (
          <div className="border border-neutral-800 rounded-lg bg-neutral-900 divide-y divide-neutral-800 max-h-80 overflow-y-auto">
            {transactions.map((t) => {
              const amt = Number(t.amount);
              const isPositive = amt > 0;
              return (
                <div key={t.id} className="p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-neutral-400">{t.type}</div>
                    <div className="text-[10px] text-neutral-600 mt-0.5">{t.description}</div>
                    <div className="text-[10px] text-neutral-600">{t.createdAt.toLocaleString("id-ID")}</div>
                  </div>
                  <div className={`text-xs font-mono shrink-0 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : "-"}Rp{Math.abs(amt).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
