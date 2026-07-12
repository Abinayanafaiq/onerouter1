import { prisma } from "@/app/lib/prisma";
import { getAllModels } from "@/app/lib/models";

export default async function AdminAnalyticsPage() {
  // Total requests
  const totalRequests = await prisma.usageLog.count();

  // Total revenue (sum of totalCost)
  const revenueAgg = await prisma.usageLog.aggregate({
    _sum: { totalCost: true },
  });
  const totalRevenue = Number(revenueAgg._sum.totalCost || 0);

  // Total tokens
  const tokenAgg = await prisma.usageLog.aggregate({
    _sum: { inputTokens: true, outputTokens: true },
  });
  const totalInputTokens = tokenAgg._sum.inputTokens || 0;
  const totalOutputTokens = tokenAgg._sum.outputTokens || 0;

  // Revenue by model
  const models = await getAllModels();
  const revenueByModel: { name: string; modelId: string; revenue: number; requests: number }[] = [];
  for (const m of models) {
    const agg = await prisma.usageLog.aggregate({
      where: { modelId: m.id },
      _sum: { totalCost: true },
      _count: true,
    });
    revenueByModel.push({
      name: m.name,
      modelId: m.modelId,
      revenue: Number(agg._sum.totalCost || 0),
      requests: agg._count,
    });
  }
  revenueByModel.sort((a, b) => b.revenue - a.revenue);

  // Top spending users
  const topUsersRaw = await prisma.usageLog.groupBy({
    by: ["userId"],
    _sum: { totalCost: true },
    _count: true,
    orderBy: { _sum: { totalCost: "desc" } },
    take: 10,
  });

  const topUsers: { email: string; totalSpent: number; requests: number }[] = [];
  for (const u of topUsersRaw) {
    if (!u.userId) continue;
    const user = await prisma.user.findUnique({
      where: { id: u.userId },
      select: { email: true },
    });
    if (user) {
      topUsers.push({
        email: user.email,
        totalSpent: Number(u._sum.totalCost || 0),
        requests: u._count,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Usage Analytics</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Statistik pemakaian & pendapatan</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900">
          <div className="text-xs text-neutral-500">Total Requests</div>
          <div className="text-2xl font-bold mt-1.5 text-teal-400">
            {totalRequests.toLocaleString("id-ID")}
          </div>
        </div>
        <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900">
          <div className="text-xs text-neutral-500">Total Revenue</div>
          <div className="text-2xl font-bold mt-1.5 text-emerald-400">
            Rp{totalRevenue.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900">
          <div className="text-xs text-neutral-500">Input Tokens</div>
          <div className="text-2xl font-bold mt-1.5 text-cyan-400">
            {totalInputTokens.toLocaleString("id-ID")}
          </div>
        </div>
        <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900">
          <div className="text-xs text-neutral-500">Output Tokens</div>
          <div className="text-2xl font-bold mt-1.5 text-blue-400">
            {totalOutputTokens.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      {/* Revenue by model */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-3">Revenue by Model</h2>
        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Model</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Requests</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {revenueByModel.map((m) => (
                <tr key={m.modelId} className="hover:bg-neutral-800/50 transition">
                  <td className="px-3 py-2.5 text-neutral-200">{m.name}</td>
                  <td className="px-3 py-2.5 text-neutral-400 font-mono text-xs">{m.requests.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2.5 text-emerald-400 font-mono text-xs">
                    Rp{m.revenue.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {revenueByModel.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-neutral-500 text-sm">
                    Belum ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top spending users */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-3">Top Spending Users</h2>
        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">User</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Requests</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {topUsers.map((u) => (
                <tr key={u.email} className="hover:bg-neutral-800/50 transition">
                  <td className="px-3 py-2.5 text-neutral-200">{u.email}</td>
                  <td className="px-3 py-2.5 text-neutral-400 font-mono text-xs">{u.requests.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2.5 text-emerald-400 font-mono text-xs">
                    Rp{u.totalSpent.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-neutral-500 text-sm">
                    Belum ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
