import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/admin-guard";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

// Jam lengkap (WIB) supaya urutan request bisa dicek, tidak cuma "baru saja".
function clock(date: Date): string {
  return date.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

export default async function AdminActivityPage() {
  await requireAdmin();
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 3600_000);
  const weekAgo = new Date(now - 7 * 24 * 3600_000);
  // Log bertanggal "masa depan" (tercatat saat jam server sempat salah) akan
  // selalu nangkring di urutan teratas dan menimbun request baru. Batasi ke
  // waktu sekarang (+1 menit toleransi) dan tampilkan peringatan terpisah.
  const cutoff = new Date(now + 60_000);

  const [newUsers24h, newUsers7d, hits24h, recentUsers, recentRequests, futureLogs] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.apiRequestLog.count({ where: { createdAt: { gte: dayAgo, lte: cutoff } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, email: true, name: true, whatsapp: true, role: true, createdAt: true },
    }),
    prisma.apiRequestLog.findMany({
      where: { createdAt: { lte: cutoff } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { email: true } } },
    }),
    prisma.apiRequestLog.aggregate({
      where: { createdAt: { gt: cutoff } },
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
  ]);
  const futureCount = futureLogs._count._all;

  const stats = [
    { label: "User baru (24 jam)", value: newUsers24h.toLocaleString("id-ID"), accent: "text-blue-400" },
    { label: "User baru (7 hari)", value: newUsers7d.toLocaleString("id-ID"), accent: "text-cyan-400" },
    { label: "Hit API (24 jam)", value: hits24h.toLocaleString("id-ID"), accent: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Aktivitas</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          User yang baru daftar & request API terbaru (read-only)
        </p>
      </div>

      {futureCount > 0 && (
        <div className="border border-amber-500/30 bg-amber-500/10 rounded-lg p-4 text-xs text-amber-200 leading-relaxed">
          <div className="font-semibold text-amber-300">
            {futureCount.toLocaleString("id-ID")} log request bertanggal di masa depan disembunyikan dari daftar ini
          </div>
          <div className="mt-1 text-amber-200/80">
            Rentang waktunya {futureLogs._min.createdAt?.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} –{" "}
            {futureLogs._max.createdAt?.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB. Biasanya karena jam
            server sempat salah (misalnya setelah reboot/maintenance). Data tidak hilang, hanya waktunya yang keliru.
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="border border-neutral-800 rounded-lg p-4 bg-neutral-900">
            <div className="text-xs text-neutral-500">{s.label}</div>
            <div className={`text-xl font-bold mt-1.5 ${s.accent}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* New Users */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-3">
          User Baru Daftar
        </h2>
        {recentUsers.length === 0 ? (
          <div className="border border-neutral-800 rounded-lg p-6 text-center text-neutral-500 text-sm">
            Belum ada user
          </div>
        ) : (
          <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 border-b border-neutral-800">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Email</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Nama</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">WhatsApp</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Role</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Daftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/wallets/${u.id}`} className="hover:underline font-medium text-neutral-200">
                        {u.email}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-300">{u.name || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-neutral-400">{u.whatsapp || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        u.role === "ADMIN" ? "bg-violet-500/15 text-violet-400" : "bg-neutral-700 text-neutral-400"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-500 text-xs" title={u.createdAt.toLocaleString("id-ID")}>
                      {timeAgo(u.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent API Hits */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-3">
          Hit API Terbaru
        </h2>
        {recentRequests.length === 0 ? (
          <div className="border border-neutral-800 rounded-lg p-6 text-center text-neutral-500 text-sm">
            Belum ada request API
          </div>
        ) : (
          <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900 overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-neutral-900 border-b border-neutral-800">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">User</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Model</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Provider</th>
                  <th className="text-right px-3 py-2.5 font-medium text-neutral-500 text-xs">Token</th>
                  <th className="text-right px-3 py-2.5 font-medium text-neutral-500 text-xs">Biaya</th>
                  <th className="text-right px-3 py-2.5 font-medium text-neutral-500 text-xs">Waktu</th>
                  <th className="text-center px-3 py-2.5 font-medium text-neutral-500 text-xs">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-xs">Kapan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {recentRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-3 py-2.5 text-neutral-200 text-xs">{r.user?.email ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <code className="text-xs text-neutral-200">{r.model}</code>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-400 text-xs">{r.provider}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-neutral-300">
                      {r.totalTokens.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-neutral-300">
                      Rp{Number(r.totalCost).toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-neutral-400">
                      {r.responseTime}ms
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        r.success ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                      }`}>
                        {r.statusCode}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-500 text-xs whitespace-nowrap" title={r.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}>
                      {timeAgo(r.createdAt)}
                      <span className="ml-1.5 font-mono text-neutral-600">{clock(r.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
