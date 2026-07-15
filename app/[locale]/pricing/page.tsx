import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/app/components/site-header";
import { ModelPricingTable } from "@/app/components/model-pricing-table";
import { FaqJsonLd } from "@/app/components/faq-json-ld";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("pricingTitle"),
    description: t("pricingDescription"),
    alternates: {
      canonical: `/${locale}/pricing`,
      languages: { "id-ID": "/id/pricing", "en-US": "/en/pricing", "x-default": "/id/pricing" },
    },
    openGraph: {
      title: `${t("pricingTitle")} | 9inference`,
      description: t("pricingDescription"),
      url: `/${locale}/pricing`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${t("pricingTitle")} | 9inference`,
      description: t("pricingDescription"),
    },
  };
}

const TOKS_TO_RP = 1000;
const TOKS_TO_USD = 0.0553;

const TRUST_BADGES = [
  {
    title: "Tanpa Langganan",
    desc: "Tanpa tagihan berulang atau komitmen bulanan. Selamanya.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Isi Saldo Kapan Saja",
    desc: "Tambah kredit hanya saat dibutuhkan — Anda yang mengontrol.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Harga Transparan",
    desc: "Tarif jelas di muka. Tanpa biaya tersembunyi, tanpa kejutan.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Keamanan Kelas Bank",
    desc: "API key terenkripsi, rate limit per-key, kontrol gaya SOC2.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Kami mengganti tiga SDK provider dengan satu key 9inference. Onboarding 10 menit dan tagihan infra turun.",
    name: "Andi Pratama",
    role: "CTO, PinjamCepat",
    initials: "AP",
  },
  {
    quote:
      "Bayar per token tanpa langganan tepat untuk lab riset kami. Kami benchmark 6 model dari satu endpoint.",
    name: "Sarah Wijaya",
    role: "ML Lead, Univ. Indonesia",
    initials: "SW",
  },
  {
    quote:
      "Routing failover menyelamatkan peluncuran kami. Saat satu provider throttle, traffic pindah otomatis — zero downtime.",
    name: "Daniel Tan",
    role: "Founder, SaaSKit",
    initials: "DT",
  },
];

const FAQS = [
  {
    q: "Apa itu API model AI murah di 9inference?",
    a: "9inference adalah gateway API model AI murah berbayar per token. Anda mengakses DeepSeek, GLM, Qwen, Kimi dan model lain lewat satu API key kompatibel OpenAI, dengan harga token dalam rupiah tanpa langganan wajib.",
  },
  {
    q: "Apa itu TOKS dan bagaimana sistem harganya?",
    a: "TOKS adalah unit kredit internal kami. 1 TOKS = Rp1.000 = US$0.0553. Setiap model punya tarif per 1 juta token dalam rupiah; Anda hanya membayar token yang benar-benar dipakai. Tanpa langganan, tanpa minimum.",
  },
  {
    q: "Apakah saya butuh kartu kredit untuk mulai?",
    a: "Tidak. Daftar gratis, buat API key, dan isi saldo kapan saja. Anda bisa mulai dengan jumlah berapa pun — tidak ada deposit minimum.",
  },
  {
    q: "Apa yang terjadi jika kredit habis?",
    a: "Request akan mengembalikan pengingat isi saldo, bukan gagal diam-diam. Tambah kredit di dompet dan Anda online lagi dalam hitungan detik. API key dan pengaturan tetap utuh.",
  },
  {
    q: "Apakah ada biaya tersembunyi atau langganan?",
    a: "Tidak ada. Anda hanya membayar token yang dipakai sesuai tarif yang dipublikasikan. Tanpa biaya bulanan, tanpa biaya platform, tanpa biaya per seat. Harga yang Anda lihat adalah harga yang Anda bayar.",
  },
  {
    q: "Bisakah saya ganti model tanpa mengubah kode?",
    a: "Ya. 9inference kompatibel OpenAI — ubah parameter model di request, SDK Anda tetap sama. Ganti antara GLM, DeepSeek, Qwen, Kimi dan lainnya dengan satu baris.",
  },
  {
    q: "Apakah data dan API key saya aman?",
    a: "API key di-hash saat disimpan, kredensial dienkripsi, dan rate limit per-key mencegah penyalahgunaan. Kami tidak melatih model dengan data Anda dan tidak membagikan prompt ke pihak ketiga.",
  },
  {
    q: "Apakah ada refund untuk kredit yang tidak terpakai?",
    a: "Kredit yang tidak terpakai tidak kedaluwarsa. Jika dalam 14 hari setelah top-up pertama Anda merasa 9inference tidak cocok, hubungi support untuk refund penuh sisa saldo.",
  },
];

const COMPARISON = [
  { feature: "Satu API key untuk semua model", ours: true, direct: false },
  { feature: "Routing failover otomatis", ours: true, direct: false },
  { feature: "Bayar per token, tanpa langganan", ours: true, direct: true },
  { feature: "SDK kompatibel OpenAI", ours: true, direct: false },
  { feature: "Billing terpadu IDR & USD", ours: true, direct: false },
  { feature: "Rate limit & rotasi per-key", ours: true, direct: false },
  { feature: "Kelola N akun provider", ours: false, direct: true },
  { feature: "N invoice terpisah / bulan", ours: false, direct: true },
];

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pricing");
  const tc = await getTranslations("Common");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <FaqJsonLd faqs={FAQS} />

      <section className="relative px-4 pt-32 pb-16 sm:px-6 sm:pt-40 sm:pb-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 15% 0%, rgba(0,255,136,0.08) 0%, transparent 60%), radial-gradient(50% 50% at 100% 0%, rgba(99,102,241,0.10) 0%, transparent 55%)",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1.5 text-[12px] font-medium text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {t("badge")}
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="glass relative overflow-hidden rounded-2xl p-6 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 -z-10"
                style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(0,255,136,0.10), transparent 70%)" }}
                aria-hidden
              />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Kurs Konversi Kredit
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="text-[11px] text-muted-foreground">1 TOKS</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">1 TOKS</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Unit kredit dasar</div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="text-[11px] text-muted-foreground">Rupiah Indonesia</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">
                    Rp{TOKS_TO_RP.toLocaleString("id-ID")}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">per TOKS</div>
                </div>
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                  <div className="text-[11px] text-accent">Dolar AS</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">
                    US${TOKS_TO_USD.toFixed(4)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">per TOKS</div>
                </div>
              </div>
              <p className="mt-4 text-[12px] text-muted-foreground">
                Isi saldo dalam rupiah atau USD — kredit dilacak dalam TOKS dan dikonversi otomatis.
                Tarif tetap dan ditampilkan sebelum setiap request.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="btn-accent group inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm"
            >
              Dapatkan API Key — Gratis
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-7 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              Isi Saldo
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">
            Tanpa kartu kredit · Batal kapan saja · Jaminan refund 14 hari
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Katalog Model
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Tarif per-token untuk setiap model
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
              Harga per 1 juta token dan ditagih dalam rupiah. Konversi ke TOKS atau USD secara instan
              menggunakan kurs di atas.
            </p>
          </div>

          <ModelPricingTable />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Detail per model:{" "}
            <Link href="/models" className="text-accent underline">
              buka katalog model AI
            </Link>{" "}
            · panduan{" "}
            <Link href="/blog/api-model-ai-murah-indonesia" className="text-accent underline">
              API model murah
            </Link>
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
            <span>
              <strong className="text-foreground">Rp1.000</strong> = 1 TOKS = <strong className="text-foreground">US$0.0553</strong>
            </span>
            <span className="hidden h-3 w-px bg-white/10 sm:inline-block" />
            <span>1Jt token = 1.000 × tarif model dalam TOKS</span>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_BADGES.map((b) => (
              <div key={b.title} className="glass card-hover rounded-2xl p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-accent">
                  {b.icon}
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                  {b.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Mengapa 9inference
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Satu API vs. mengelola setiap provider sendiri
            </h2>
          </div>

          <div className="glass mt-10 overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-left">
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Kemampuan
                  </th>
                  <th className="px-5 py-4 text-center text-[13px] font-semibold text-accent">
                    9inference
                  </th>
                  <th className="px-5 py-4 text-center text-[13px] font-semibold text-muted-foreground">
                    Langsung ke provider
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 text-[13px] text-foreground">{row.feature}</td>
                    <td className="px-5 py-3.5 text-center">
                      {row.ours ? (
                        <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-5 w-5 text-accent">
                          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {row.direct ? (
                        <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-5 w-5 text-muted-foreground">
                          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-5 w-5 text-muted-foreground/30">
                          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="relative px-4 py-16 sm:px-6 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.05), transparent 70%)" }}
          aria-hidden
        />
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Dipercaya builder
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Tim rilis lebih cepat dengan 9inference
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="glass card-hover flex flex-col rounded-2xl p-6">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-accent/60">
                  <path d="M7 7h4v6c0 3-2 5-4 5V7Zm10 0h4v6c0 3-2 5-4 5V7Z" fill="currentColor" />
                </svg>
                <blockquote className="mt-3 flex-1 text-[13px] leading-relaxed text-foreground/90">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
                    {t.initials}
                  </span>
                  <div className="leading-tight">
                    <div className="text-[13px] font-semibold text-foreground">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              FAQ
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Pertanyaan, dijawab
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="glass group rounded-xl border border-white/[0.06] p-5 transition hover:border-white/10"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold text-foreground">
                  {f.q}
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="glass relative overflow-hidden rounded-3xl p-12 text-center sm:p-20">
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(50% 60% at 50% 0%, rgba(0,255,136,0.10), transparent 70%), radial-gradient(50% 60% at 50% 100%, rgba(99,102,241,0.10), transparent 70%)",
              }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-30" aria-hidden />

            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1.5 text-[12px] font-medium text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Mulai dalam kurang dari 5 menit
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              Rilis fitur AI hari ini
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Buat API key sekarang. Satu endpoint, semua model frontier, ditagih per token —
              mulai dari 1 TOKS = Rp1.000 = US$0.0553.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-accent group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm"
              >
                Dapatkan API Key Gratis
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/dashboard/docs"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-7 py-3.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                Baca dokumentasi
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Tanpa kartu kredit
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Jaminan refund 14 hari
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Kredit tidak kedaluwarsa
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
