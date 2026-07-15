import { prisma } from "@/app/lib/prisma";
import { PackageStockEditor } from "./stock-editor";

export default async function AdminPackagesPage() {
  const packages = await prisma.package.findMany({
    orderBy: { sort: "asc" },
  });

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Paket & Stok</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Stok 0 = tidak bisa dibeli
        </p>
      </div>
      <div className="space-y-2">
        {packages.map((p) => (
          <PackageStockEditor
            key={p.id}
            pkg={{
              id: p.id,
              name: p.name,
              price: p.price,
              stock: p.stock,
              isActive: p.isActive,
            }}
          />
        ))}
      </div>
    </div>
  );
}
