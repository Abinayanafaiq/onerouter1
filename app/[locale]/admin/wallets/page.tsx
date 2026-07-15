import { prisma } from "@/app/lib/prisma";
import { Link } from "@/i18n/navigation";

export default async function AdminWalletsPage() {
  const wallets = await prisma.wallet.findMany({
    include: { user: true },
    orderBy: { balance: "desc" },
  });

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Wallet Users</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Kelola saldo user · Total beredar: Rp{totalBalance.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </p>
      </div>

      {wallets.length === 0 ? (
        <div className="border border-neutral-800 rounded-lg p-6 text-center text-neutral-500 text-sm">
          Belum ada wallet
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">User</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">WhatsApp</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Saldo</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Dibuat</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {wallets.map((w) => (
                <tr key={w.id} className="hover:bg-neutral-800/50 transition">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/wallets/${w.user.id}`}
                      className="hover:underline font-medium text-neutral-200"
                    >
                      {w.user.email}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-neutral-300">
                    {w.user.whatsapp || "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-neutral-300">
                    Rp{Number(w.balance).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-500 text-xs">
                    {w.createdAt.toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/wallets/${w.user.id}`}
                      className="text-xs text-neutral-400 hover:text-neutral-200 transition"
                    >
                      Kelola →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
