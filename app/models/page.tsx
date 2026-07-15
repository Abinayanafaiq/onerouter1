import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/app/components/public-shell";
import { BreadcrumbJsonLd } from "@/app/components/breadcrumb-json-ld";
import { getEnabledModels } from "@/app/lib/models";
import { toModelCardData } from "@/app/lib/model-card-data";
import { getSiteUrl } from "@/app/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katalog Model AI & Harga Token Murah",
  description:
    "Daftar model AI murah di 9inference: DeepSeek, GLM, Qwen, Kimi & lainnya. Lihat harga token per 1 juta, context window, dan mulai pakai API kompatibel OpenAI.",
  keywords: [
    "katalog model AI",
    "API model murah",
    "harga token AI",
    "DeepSeek API",
    "GLM API",
    "Qwen API",
  ],
  alternates: { canonical: "/models" },
  openGraph: {
    title: "Katalog Model AI & Harga Token Murah | 9inference",
    description:
      "Bandingkan model AI dan harga token murah. Satu API key untuk DeepSeek, GLM, Qwen, Kimi & lainnya.",
    url: "/models",
  },
};

const TOKS_TO_RP = 1000;

export default async function PublicModelsPage() {
  const enabled = await getEnabledModels();
  const models = enabled.map(toModelCardData);
  const base = getSiteUrl();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Katalog Model AI 9inference",
    numberOfItems: models.length,
    itemListElement: models.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/models/${encodeURIComponent(m.modelId)}`,
      name: m.name,
    })),
  };

  return (
    <PublicShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Beranda", path: "/" },
          { name: "Model AI", path: "/models" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <section className="px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Katalog publik
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Model AI murah — harga token transparan
            </h1>
            <p className="mt-4 text-base text-muted-foreground">
              Bandingkan API model AI murah dari berbagai provider. Semua bisa dipanggil lewat
              satu endpoint kompatibel OpenAI. Bayar per token (TOKS), tanpa langganan.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pricing" className="btn-accent rounded-xl px-5 py-2.5 text-sm">
                Lihat harga lengkap
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium transition hover:border-white/20"
              >
                Dapatkan API key gratis
              </Link>
            </div>
          </div>

          {models.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-white/10 p-12 text-center text-sm text-muted-foreground">
              Katalog model sedang diperbarui.
            </div>
          ) : (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {models.map((m) => {
                const inToks = m.inputPricePerMillion / TOKS_TO_RP;
                const outToks = m.outputPricePerMillion / TOKS_TO_RP;
                return (
                  <Link
                    key={m.id}
                    href={`/models/${encodeURIComponent(m.modelId)}`}
                    className="glass card-hover group flex flex-col rounded-2xl p-5 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight group-hover:text-accent">
                          {m.name}
                        </h2>
                        <p className="mt-1 text-[12px] text-muted-foreground">{m.provider}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          m.maintenanceMode
                            ? "border-amber-500/30 text-amber-400"
                            : "border-accent/25 text-accent"
                        }`}
                      >
                        {m.maintenanceMode ? "Pemeliharaan" : "Aktif"}
                      </span>
                    </div>
                    <code className="mt-3 truncate rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1 font-mono text-[11px] text-foreground/80">
                      {m.modelId}
                    </code>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-lg border border-white/[0.06] p-2.5">
                        <div className="text-[10px] text-muted-foreground">Input / 1Jt</div>
                        <div className="mt-0.5 font-semibold">
                          Rp{m.inputPricePerMillion.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {inToks.toLocaleString("id-ID", { maximumFractionDigits: 1 })} TOKS
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] p-2.5">
                        <div className="text-[10px] text-muted-foreground">Output / 1Jt</div>
                        <div className="mt-0.5 font-semibold">
                          Rp{m.outputPricePerMillion.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {outToks.toLocaleString("id-ID", { maximumFractionDigits: 1 })} TOKS
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-[12px] text-muted-foreground">
                      Konteks: {m.contextWindow || "—"} ·{" "}
                      <span className="text-accent">Detail & cara pakai →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-14 rounded-2xl border border-accent/20 bg-accent/5 p-6 sm:p-8">
            <h2 className="text-xl font-bold">Cari API model murah untuk production?</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              9inference memberi harga token transparan dalam rupiah, isi saldo fleksibel, dan
              satu API key multi-model. Baca juga panduan{" "}
              <Link href="/blog/api-model-ai-murah-indonesia" className="text-accent underline">
                API model AI murah di Indonesia
              </Link>
              .
            </p>
            <Link
              href="/register"
              className="btn-accent mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm"
            >
              Mulai gratis
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
