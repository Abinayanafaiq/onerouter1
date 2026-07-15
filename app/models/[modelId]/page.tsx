import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/app/components/public-shell";
import { BreadcrumbJsonLd } from "@/app/components/breadcrumb-json-ld";
import { getEnabledModels, getModelByModelId } from "@/app/lib/models";
import { toModelCardData } from "@/app/lib/model-card-data";
import { getSiteUrl } from "@/app/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ modelId: string }> };

const TOKS_TO_RP = 1000;
const TOKS_TO_USD = 0.0553;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modelId: raw } = await params;
  const modelId = decodeURIComponent(raw);
  const model = await getModelByModelId(modelId);
  if (!model || !model.enabled) {
    return { title: "Model tidak ditemukan" };
  }
  const m = toModelCardData(model);
  const title = `${m.name} API Murah — Harga Token & Cara Pakai`;
  const description = `Pakai ${m.name} (${m.provider}) lewat API murah OneRouter. Input Rp${m.inputPricePerMillion.toLocaleString("id-ID")}/1Jt token, output Rp${m.outputPricePerMillion.toLocaleString("id-ID")}/1Jt. Kompatibel OpenAI, bayar per token.`;
  return {
    title,
    description,
    keywords: [
      `${m.name} API`,
      `${m.name} API murah`,
      `${m.provider} API`,
      "API model murah",
      "harga token AI",
      m.modelId,
    ],
    alternates: { canonical: `/models/${encodeURIComponent(m.modelId)}` },
    openGraph: {
      title: `${title} | OneRouter`,
      description,
      url: `/models/${encodeURIComponent(m.modelId)}`,
    },
  };
}

export default async function PublicModelDetailPage({ params }: Props) {
  const { modelId: raw } = await params;
  const modelId = decodeURIComponent(raw);
  const model = await getModelByModelId(modelId);
  if (!model || !model.enabled) notFound();

  const m = toModelCardData(model);
  const others = (await getEnabledModels())
    .map(toModelCardData)
    .filter((x) => x.modelId !== m.modelId)
    .slice(0, 4);
  const base = getSiteUrl();
  const inToks = m.inputPricePerMillion / TOKS_TO_RP;
  const outToks = m.outputPricePerMillion / TOKS_TO_RP;

  const productLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${m.name} API`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: `${base}/models/${encodeURIComponent(m.modelId)}`,
    description:
      m.description ||
      `API ${m.name} murah via OneRouter. Bayar per token, kompatibel OpenAI.`,
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: String(m.inputPricePerMillion),
      description: `Input per 1 juta token: Rp${m.inputPricePerMillion.toLocaleString("id-ID")}`,
      availability: m.maintenanceMode
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  const curl = `curl ${base}/v1/chat/completions \\
  -H "Authorization: Bearer or_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.modelId}",
    "messages": [{"role":"user","content":"Halo"}]
  }'`;

  return (
    <PublicShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Beranda", path: "/" },
          { name: "Model AI", path: "/models" },
          { name: m.name, path: `/models/${encodeURIComponent(m.modelId)}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <article className="px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            {m.provider} · API model murah
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {m.name} API murah — harga token & cara pakai
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            {m.description ||
              `Akses ${m.name} lewat gateway OneRouter dengan harga token transparan. Satu API key multi-model, kompatibel OpenAI SDK, bayar per token tanpa langganan.`}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Input / 1Jt token"
              value={`Rp${m.inputPricePerMillion.toLocaleString("id-ID")}`}
              sub={`${inToks.toLocaleString("id-ID", { maximumFractionDigits: 1 })} TOKS · US$${(inToks * TOKS_TO_USD).toFixed(2)}`}
            />
            <Stat
              label="Output / 1Jt token"
              value={`Rp${m.outputPricePerMillion.toLocaleString("id-ID")}`}
              sub={`${outToks.toLocaleString("id-ID", { maximumFractionDigits: 1 })} TOKS · US$${(outToks * TOKS_TO_USD).toFixed(2)}`}
            />
            <Stat
              label="Context window"
              value={m.contextWindow || "—"}
              sub={m.maintenanceMode ? "Sedang pemeliharaan" : "Siap production"}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-[12px]">
            {m.supportsText && <Badge>Teks</Badge>}
            {m.supportsImages && <Badge>Gambar</Badge>}
            {m.supportsStreaming && <Badge>Streaming</Badge>}
            <Badge>OpenAI-compatible</Badge>
          </div>

          <section className="mt-12">
            <h2 className="text-xl font-bold">Cara memanggil {m.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ganti base URL ke OneRouter, set model ke{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px]">
                {m.modelId}
              </code>
              . Cocok sebagai alternatif API murah tanpa ganti SDK.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-foreground/90">
              {curl}
            </pre>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-bold">Kenapa pakai {m.name} di OneRouter?</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Harga token AI transparan dalam rupiah (1 TOKS = Rp1.000)</li>
              <li>Satu API key untuk multi-model — ganti model tanpa ganti integrasi</li>
              <li>Bayar per token, tanpa langganan wajib</li>
              <li>Rate limit per key, logging pemakaian, isi saldo fleksibel</li>
            </ul>
          </section>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="btn-accent rounded-xl px-5 py-3 text-center text-sm">
              Dapatkan API key — coba {m.name}
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-medium transition hover:border-white/20"
            >
              Bandingkan harga token
            </Link>
            <Link
              href="/models"
              className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-medium transition hover:border-white/20"
            >
              Semua model
            </Link>
          </div>

          {others.length > 0 && (
            <section className="mt-16">
              <h2 className="text-lg font-bold">Model AI murah lainnya</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/models/${encodeURIComponent(o.modelId)}`}
                      className="block rounded-xl border border-white/10 p-4 text-sm transition hover:border-white/20"
                    >
                      <div className="font-semibold">{o.name}</div>
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {o.provider} · dari Rp{o.inputPricePerMillion.toLocaleString("id-ID")}/1Jt
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-12 text-sm text-muted-foreground">
            Baca juga:{" "}
            <Link href="/blog/api-model-ai-murah-indonesia" className="text-accent underline">
              panduan API model AI murah
            </Link>{" "}
            ·{" "}
            <Link href="/blog/bayar-per-token-vs-langganan" className="text-accent underline">
              bayar per token vs langganan
            </Link>
          </p>
        </div>
      </article>
    </PublicShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-muted-foreground">
      {children}
    </span>
  );
}
