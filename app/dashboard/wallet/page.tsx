import { auth } from "@/app/lib/auth";
import { getOrCreateWallet, getTransactions } from "@/app/lib/wallet";
import { getWalletSummary } from "@/app/lib/usage-stats";
import { prisma } from "@/app/lib/prisma";
import { IDR_PER_TOKS, TOKS_LABEL, idrToToks } from "@/app/lib/constants";
import Link from "next/link";
import { WalletTopUpForm } from "./topup-form";

function fmtToks(toks: number, max = 4): string {
  return toks.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: max });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function WalletPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const wallet = await getOrCreateWallet(userId);
  const transactions = await getTransactions(wallet.id, 100);
  const summary = await getWalletSummary(userId);

  // Get last used whatsapp from previous orders
  const lastOrder = await prisma.order.findFirst({
    where: { userId, whatsapp: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { whatsapp: true },
  });

  const balance = Number(wallet.balance);
  const balanceToks = idrToToks(balance);
  const isEmpty = balance <= 0;

  const overview = [
    {
      label: "Saldo Kredit",
      value: `${fmtToks(summary.balanceToks)} ${TOKS_LABEL}`,
      sub: `≈ Rp${balance.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`,
      accent: isEmpty ? "text-red-500" : "text-green-500",
    },
    {
      label: "Total Dibeli",
      value: `${fmtToks(idrToToks(summary.totalPurchased))} ${TOKS_LABEL}`,
      sub: "Total top up",
    },
    {
      label: "Total Terpakai",
      value: `${fmtToks(idrToToks(summary.totalUsed))} ${TOKS_LABEL}`,
      sub: `${summary.totalRequests.toLocaleString("id-ID")} request`,
    },
    {
      label: "Estimasi Sisa Request",
      value:
        summary.estimatedRemainingRequests === null
          ? "—"
          : summary.estimatedRemainingRequests.toLocaleString("id-ID"),
      sub:
        summary.avgCostPerRequest > 0
          ? `~${fmtToks(idrToToks(summary.avgCostPerRequest), 6)} ${TOKS_LABEL}/req`
          : "Belum ada pemakaian",
    },
    {
      label: "Top Up Terakhir",
      value: fmtDate(summary.lastTopUpAt),
      sub: " ",
      small: true,
    },
    {
      label: "Pemakaian Terakhir",
      value: fmtDate(summary.lastUsageAt),
      sub: " ",
      small: true,
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Wallet</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Top up kredit {TOKS_LABEL}, bayar AI sesuai pemakaian
          </p>
        </div>
        <Link href="/dashboard/usage" className="text-xs border px-3 py-1.5 rounded-md hover:bg-muted transition">
          Usage Analytics →
        </Link>
      </div>

      {/* Balance card */}
      <div className={`border rounded-xl p-5 ${isEmpty ? "border-red-500/30 bg-red-500/5" : ""}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saldo Kredit</h2>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition">
            ← Dashboard
          </Link>
        </div>
        <div className={`text-4xl font-bold ${isEmpty ? "text-red-500" : "text-green-500"}`}>
          {balanceToks.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}{" "}
          <span className="text-lg font-semibold">{TOKS_LABEL}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          ≈ Rp{balance.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          {" · "}1 {TOKS_LABEL} = Rp{IDR_PER_TOKS.toLocaleString("id-ID")}
        </p>
        {isEmpty ? (
          <div className="mt-3 border border-red-500/30 bg-red-500/10 rounded-md p-3 text-xs text-red-500">
            Kredit habis. Layanan AI terkunci sampai kamu top up. Isi kredit di bawah untuk melanjutkan.
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            Kredit terpotong otomatis setiap request AI berdasarkan token aktual.
          </p>
        )}
      </div>

      {/* Wallet overview metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {overview.map((o) => (
          <div key={o.label} className="border rounded-lg p-4">
            <div className="text-[11px] text-muted-foreground">{o.label}</div>
            <div className={`font-bold mt-1 ${o.small ? "text-sm" : "text-lg"} ${o.accent ?? ""}`}>
              {o.value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{o.sub}</div>
          </div>
        ))}
      </div>

      {/* Top Up */}
      <div className="border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Top Up Kredit {TOKS_LABEL}</h2>
        <p className="text-xs text-muted-foreground">
          Masukkan jumlah {TOKS_LABEL} (1 {TOKS_LABEL} = Rp{IDR_PER_TOKS.toLocaleString("id-ID")}). Pembayaran via QRIS/Pakasir auto-konfirmasi.
          Bayar hanya untuk yang kamu pakai — tanpa langganan.
        </p>
        <WalletTopUpForm whatsapp={lastOrder?.whatsapp} />
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Riwayat Transaksi</h2>
        {transactions.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {transactions.map((t) => {
              const amt = Number(t.amount);
              const isPositive = amt > 0;
              return (
                <div key={t.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        isPositive
                          ? "bg-green-500/15 text-green-600"
                          : "bg-red-500/15 text-red-600"
                      }`}>
                        {t.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t.createdAt.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                  </div>
                  <div className={`text-sm font-mono shrink-0 font-bold text-right ${
                    isPositive ? "text-green-600" : "text-red-600"
                  }`}>
                    <div>
                      {isPositive ? "+" : "-"}
                      {idrToToks(Math.abs(amt)).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })} {TOKS_LABEL}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal">
                      Rp{Math.abs(amt).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                    </div>
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
