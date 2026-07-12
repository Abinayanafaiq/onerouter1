import { prisma } from "@/app/lib/prisma";
import { notFound } from "next/navigation";
import OrderActions from "./actions";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, package: true, apiKey: true },
  });
  if (!order) notFound();

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="p-3 flex justify-between border-b border-neutral-800 last:border-0">
      <span className="text-neutral-500 text-sm">{label}</span>
      <span className="font-medium text-sm text-neutral-200">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Order Detail</h1>
        <p className="text-xs font-mono text-neutral-600 mt-0.5">{order.id}</p>
      </div>

      <div className="border border-neutral-800 rounded-lg bg-neutral-900">
        <Row label="User" value={order.user.email} />
        {order.whatsapp && <Row label="WhatsApp" value={order.whatsapp} />}
        <Row label="Paket" value={order.package.name} />
        <Row label="Harga" value={`Rp${order.amount.toLocaleString("id-ID")}`} />
        <Row label="Metode" value={order.paymentMethod} />
        {order.cryptoChain && <Row label="Chain" value={order.cryptoChain} />}
        {order.btcpayInvoiceId && <Row label="BTCPay" value={<span className="font-mono text-xs">{order.btcpayInvoiceId}</span>} />}
        {order.pakasirMethod && <Row label="Pakasir Method" value={order.pakasirMethod} />}
        {order.pakasirPaymentNumber && (
          <Row
            label="Pakasir QR/VA"
            value={
              <span className="font-mono text-xs break-all max-w-[260px] inline-block">
                {order.pakasirPaymentNumber.slice(0, 40)}...
              </span>
            }
          />
        )}
        {order.pakasirExpiredAt && (
          <Row label="Pakasir Expired" value={order.pakasirExpiredAt.toLocaleString("id-ID")} />
        )}
        <Row
          label="Status"
          value={
            <span className={
              order.status === "PENDING" ? "text-yellow-400" :
              order.status === "APPROVED" ? "text-green-400" :
              "text-red-400"
            }>{order.status}</span>
          }
        />
        <Row label="Dibuat" value={order.createdAt.toLocaleString("id-ID")} />
        {order.expiresAt && <Row label="Expires" value={order.expiresAt.toLocaleDateString("id-ID")} />}
      </div>

      {order.paymentProof && (
        <div className="border border-neutral-800 rounded-lg p-3 bg-neutral-900">
          <h3 className="text-sm font-medium text-neutral-300 mb-2">Bukti Pembayaran</h3>
          <img src={order.paymentProof} alt="Bukti" className="max-w-full rounded-md border border-neutral-800" />
        </div>
      )}

      {order.apiKey && (
        <div className="border border-neutral-800 rounded-lg p-3 bg-neutral-900 space-y-2">
          <h3 className="text-sm font-medium text-neutral-300">API Key</h3>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Local (user):</div>
            <code className="text-xs font-mono break-all bg-neutral-800 px-2 py-1 rounded block text-neutral-300">
              {order.apiKey.key}
            </code>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Master (hidden):</div>
            <code className="text-xs font-mono break-all bg-neutral-800 px-2 py-1 rounded block text-neutral-500">
              {order.apiKey.masterApiKey
                ? `${order.apiKey.masterApiKey.slice(0, 12)}${"*".repeat(20)}${order.apiKey.masterApiKey.slice(-4)}`
                : "-"}
            </code>
          </div>
          <div className="text-xs text-neutral-500">
            {(Number(order.apiKey.tokenUsed) / 1_000_000).toFixed(1)} / {(Number(order.apiKey.tokenQuota) / 1_000_000).toFixed(0)} Jt
          </div>
        </div>
      )}

      {order.adminNote && (
        <div className="border border-neutral-800 rounded-lg p-3 bg-neutral-900 text-sm text-neutral-400 italic">
          📝 {order.adminNote}
        </div>
      )}

      {order.status === "PENDING" && (
        <OrderActions orderId={order.id} packageId={order.packageId} userId={order.userId} />
      )}
    </div>
  );
}
