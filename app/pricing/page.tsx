import Link from "next/link";
import { getAllPackages } from "@/app/lib/packages";
import { SiteHeader } from "@/app/components/site-header";

export default async function PricingPage() {
  const packages = await getAllPackages();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-center mb-2">Paket Harga</h1>
        <p className="text-center text-muted-foreground mb-10">
          Semua paket aktif 14 hari, akses semua model AI
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {packages.map((p) => (
            <div
              key={p.id}
              className={`border rounded-lg p-6 relative ${
                p.highlight ? "border-foreground shadow-lg" : ""
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 bg-foreground text-background text-xs px-2 py-0.5 rounded">
                  Populer
                </span>
              )}
              <h2 className="text-xl font-bold">{p.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">
                  Rp{p.price.toLocaleString("id-ID")}
                </span>
                <span className="text-muted-foreground text-sm"> / 14 hari</span>
              </div>
              <div className="mt-1 text-sm font-medium">
                {(Number(p.tokenQuota) / 1_000_000).toFixed(0)} Juta token
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-xs text-muted-foreground">
                {p.stock > 0 ? (
                  <span>Stok: {p.stock} tersedia</span>
                ) : (
                  <span className="text-red-600 font-medium">Stok habis</span>
                )}
              </div>
              {p.stock > 0 ? (
                <Link
                  href={`/checkout/${p.id}`}
                  className={`mt-4 block text-center py-2 rounded-md font-medium ${
                    p.highlight
                      ? "bg-foreground text-background"
                      : "border hover:bg-muted"
                  }`}
                >
                  Beli {p.name}
                </Link>
              ) : (
                <button
                  disabled
                  className="mt-4 block w-full text-center py-2 rounded-md font-medium border opacity-50 cursor-not-allowed"
                >
                  Habis
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}