import { prisma } from "@/app/lib/prisma";
import { PackagesManager } from "./packages-manager";

export default async function AdminPackagesPage() {
  const packages = await prisma.package.findMany({
    orderBy: { sort: "asc" },
  });

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
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Paket &amp; Stok</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Tambah, edit, atau hapus paket. Paket yang sudah punya pesanan tidak bisa dihapus — nonaktifkan saja.
        </p>
      </div>
      <PackagesManager packages={data} />
    </div>
  );
}
