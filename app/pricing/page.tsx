import Link from "next/link";
import { SiteHeader } from "@/app/components/site-header";
import { ModelPricingTable } from "@/app/components/model-pricing-table";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pay As You Go
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">Model Pricing</h1>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Harga per 1 juta token untuk tiap model. Tanpa langganan, tanpa komitmen bulanan —
          bayar hanya untuk token yang kamu pakai.
        </p>

        <div className="max-w-4xl mx-auto">
          <ModelPricingTable />

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { t: "Tanpa Langganan", d: "Tidak ada tagihan berulang atau paket bulanan." },
              { t: "Top Up Sesukamu", d: "Isi kredit hanya sebanyak yang dibutuhkan." },
              { t: "Harga Transparan", d: "Tarif jelas di depan, tanpa biaya tersembunyi." },
            ].map((b) => (
              <div key={b.t} className="border border-foreground/10 rounded-xl p-5 bg-muted/30">
                <h3 className="font-semibold mb-1">{b.t}</h3>
                <p className="text-sm text-muted-foreground">{b.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="bg-white text-black px-8 py-3.5 rounded-xl font-semibold hover:bg-foreground/90 transition shadow-lg shadow-white/10"
            >
              Get Started
            </Link>
            <Link
              href="/dashboard/wallet"
              className="border px-8 py-3.5 rounded-xl font-semibold hover:bg-muted transition"
            >
              Top Up Credits
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
