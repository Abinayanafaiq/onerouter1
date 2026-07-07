import Link from "next/link";
import { getAllPackages } from "@/app/lib/packages";
import { SUPPORTED_MODELS, APP_NAME, APP_TAGLINE } from "@/app/lib/constants";
import { SiteHeader } from "@/app/components/site-header";

function formatRupiah(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

function formatToken(n: bigint): string {
  const jt = Number(n) / 1_000_000;
  return `${jt} Jt`;
}

export default async function Home() {
  const packages = await getAllPackages();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground mb-6">
          OpenAI-compatible API
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
          {APP_TAGLINE}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          Akses 5 model AI premium dengan 1 API key. Bayar sesuai paket, pakai
          sampai token habis. Endpoint kompatibel dengan SDK OpenAI.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/pricing"
            className="bg-foreground text-background px-5 py-2.5 rounded-md font-medium hover:opacity-90"
          >
            Lihat Paket
          </Link>
          <Link
            href="/register"
            className="border px-5 py-2.5 rounded-md font-medium hover:bg-muted"
          >
            Daftar Sekarang
          </Link>
        </div>
      </section>

      {/* Models */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-2">
          5 Model AI Tersedia
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          Semua model bisa dipakai dengan API key yang sama
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUPPORTED_MODELS.map((m) => (
            <div key={m.id} className="border rounded-lg p-5 hover:shadow-sm transition">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{m.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {m.contextWindow}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{m.description}</p>
              <code className="text-xs block mt-3 px-2 py-1 rounded bg-muted font-mono">
                {m.id}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Paket Langganan</h2>
        <p className="text-center text-muted-foreground mb-10">
          Pilih sesuai kebutuhan, semua aktif 7 hari
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
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">
                  {formatRupiah(p.price)}
                </span>
                <span className="text-muted-foreground text-sm"> / 7 hari</span>
              </div>
              <div className="mt-1 text-sm font-medium text-primary">
                {formatToken(p.tokenQuota)} token
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
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

      {/* Cara Kerja */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">Cara Kerja</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { n: 1, t: "Daftar & Pilih Paket", d: "Buat akun, pilih paket sesuai kebutuhan" },
            { n: 2, t: "Transfer & Konfirmasi", d: "Bayar via transfer, upload bukti" },
            { n: 3, t: "Dapat API Key", d: "Admin aktivasi, dapat API key instan" },
            { n: 4, t: "Pakai Endpoint", d: "Pakai endpoint OpenAI-compatible" },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-foreground text-background flex items-center justify-center font-bold mb-3">
                {s.n}
              </div>
              <h3 className="font-semibold mb-1">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>
            {APP_NAME} - {APP_TAGLINE}
          </p>
          <p className="mt-2">
            Powered by OpenAI-compatible API &middot; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
