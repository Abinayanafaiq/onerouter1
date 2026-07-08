import { prisma } from "@/app/lib/prisma";
import Link from "next/link";

export default async function AdminPage() {
  const [userCount, orderCount, pendingCount, activeKeyCount, totalRequests, recentOrders, revenue] =
    await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.apiKey.count({ where: { isActive: true } }),
      prisma.apiKey.aggregate({ _sum: { requestCount: true } }),
      prisma.order.findMany({
        include: { user: true, package: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.order.aggregate({
        where: { status: "APPROVED" },
        _sum: { amount: true },
      }),
    ]);

  const stats = [
    { label: "Users", value: String(userCount), accent: "text-blue-400" },
    { label: "Orders", value: String(orderCount), accent: "text-cyan-400" },
    { label: "Pending", value: String(pendingCount), accent: pendingCount > 0 ? "text-yellow-400" : "text-neutral-400" },
    { label: "API Keys", value: String(activeKeyCount), accent: "text-green-400" },
    { label: "Requests", value: (totalRequests._sum.requestCount || 0).toLocaleString("id-ID"), accent: "text-teal-400" },
    { label: "Revenue", value: `Rp${(revenue._sum.amount || 0).toLocaleString("id-ID")}`, accent: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Dashboard</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Ringkasan operasional</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="border border-neutral-800 rounded-lg p-4 bg-neutral-900"
          >
            <div className="text-xs text-neutral-500">{s.label}</div>
            <div className={`text-2xl font-bold mt-1.5 ${s.accent}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">Order Terbaru</h2>
          <Link href="/admin/orders" className="text-xs text-neutral-500 hover:text-neutral-300 transition">
            Semua →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="border border-neutral-800 rounded-lg p-6 text-center text-neutral-500 text-sm">
            Belum ada order
          </div>
        ) : (
          <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 border-b border-neutral-800">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">User</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Paket</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Jumlah</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/orders/${o.id}`} className="hover:underline font-medium text-neutral-200">
                        {o.user.email}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-300">{o.package.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-neutral-400">
                      Rp{o.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="px-3 py-2.5 text-neutral-500 text-xs">
                      {o.createdAt.toLocaleDateString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/admin/orders"
          className="border border-neutral-800 rounded-lg p-3 hover:bg-neutral-900 transition flex items-center gap-2"
        >
          <span className="text-neutral-400 text-sm">📋</span>
          <div>
            <div className="font-medium text-sm text-neutral-200">Orders</div>
            <div className="text-xs text-neutral-500">Approve / reject</div>
          </div>
        </Link>
        <Link
          href="/admin/packages"
          className="border border-neutral-800 rounded-lg p-3 hover:bg-neutral-900 transition flex items-center gap-2"
        >
          <span className="text-neutral-400 text-sm">📦</span>
          <div>
            <div className="font-medium text-sm text-neutral-200">Paket & Stok</div>
            <div className="text-xs text-neutral-500">Atur stok</div>
          </div>
        </Link>
        <Link
          href="/dashboard"
          className="border border-neutral-800 rounded-lg p-3 hover:bg-neutral-900 transition flex items-center gap-2"
        >
          <span className="text-neutral-400 text-sm">🖥️</span>
          <div>
            <div className="font-medium text-sm text-neutral-200">User View</div>
            <div className="text-xs text-neutral-500">Lihat sebagai user</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-500/15 text-yellow-400",
    APPROVED: "bg-green-500/15 text-green-400",
    REJECTED: "bg-red-500/15 text-red-400",
    CANCELLED: "bg-neutral-700 text-neutral-400",
  };
  const label: Record<string, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[status] || ""}`}>
      {label[status] || status}
    </span>
  );
}