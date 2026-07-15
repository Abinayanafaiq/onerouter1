import { prisma } from "@/app/lib/prisma";
import { Link } from "@/i18n/navigation";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { user: true, package: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-neutral-100">Orders</h1>
      <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800 bg-neutral-900">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-800/50 transition"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-neutral-200">{o.user.email}</span>
                <span className="text-sm text-neutral-500">·</span>
                <span className="text-sm text-neutral-300">{o.package.name}</span>
                <StatusPill status={o.status} />
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Rp{o.amount.toLocaleString("id-ID")} · {o.paymentMethod} · {o.createdAt.toLocaleDateString("id-ID")}
                {o.cryptoChain && ` · ${o.cryptoChain}`}
              </div>
            </div>
            <span className="text-xs text-neutral-500 shrink-0">Detail →</span>
          </Link>
        ))}
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
