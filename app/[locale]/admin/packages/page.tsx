import { prisma } from "@/app/lib/prisma";
import { listUserTokenPackages } from "@/app/lib/admin-api-keys";
import { PackagesManager } from "./packages-manager";
import { UserPackagesTable } from "./user-packages-table";

export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  const [packages, userPackages] = await Promise.all([
    prisma.package.findMany({
      orderBy: { sort: "asc" },
    }),
    listUserTokenPackages(),
  ]);

  const data = packages.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    tokenQuota: p.tokenQuota.toString(),
    price: p.price,
    durationDays: p.durationDays,
    sort: p.sort,
    stock: p.stock,
    productType: p.productType,
    isActive: p.isActive,
  }));

  return (
    <div className="space-y-10">
      <div className="space-y-4 max-w-3xl">
        <div>
          <h1 className="text-xl font-bold text-neutral-100">Paket &amp; Stok</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Tambah, edit, atau hapus paket. Paket yang sudah punya pesanan tidak bisa dihapus — nonaktifkan saja.
          </p>
        </div>
        <PackagesManager packages={data} />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100">Paket Aktif User</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Semua API key paket token yang pernah diterbitkan, beserta sisa kuota dan masa aktifnya.
          </p>
        </div>
        <UserPackagesTable packages={userPackages.packages} summary={userPackages.summary} />
      </div>
    </div>
  );
}
