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

/* ===== Line icons (stroke 1.5, Lucide-style) ===== */
function Icon({ name, className = "w-6 h-6" }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    key: <><circle cx="7.5" cy="15.5" r="3.5" /><path d="M10 13 20 3" /><path d="m16 5 3 3" /><path d="m19 2 3 3" /></>,
    wallet: <><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M16 12h4" /><path d="M3 9h18" /></>,
    bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
    shield: <><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></>,
    mapPin: <><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
    rocket: <><path d="M5 13c-1.5 1.5-2 5-2 5s3.5-.5 5-2" /><path d="M14 4c3 0 6 3 6 6 0 4-4 8-8 10l-4-4c2-4 6-8 10-8z" /><path d="m9 15-3 3" /><circle cx="14.5" cy="9.5" r="1.5" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /><path d="M6 15h4" /></>,
    check: <path d="m4 12 5 5L20 6" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  };
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

const modelLetter: Record<string, string> = {
  "glm-5.2": "G",
  "deepseek-v4-pro": "D",
};

export default async function Home() {
  const packages = await getAllPackages();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SiteHeader />

      {/* ===== HERO ===== */}
      <section className="relative container mx-auto px-4 pt-28 pb-24 text-center">
        {/* Grid background */}
        <div className="absolute inset-0 -z-10 grid-bg" aria-hidden />
        {/* Subtle white glow */}
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] -z-10 animate-pulse-soft"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)" }}
          aria-hidden
        />

        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-foreground/15 bg-muted/50 backdrop-blur text-xs font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          OpenAI-compatible API · Live
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up-delay-1 text-5xl sm:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
          {APP_TAGLINE.split("-")[0]}
          <span className="block gradient-text mt-2">{APP_TAGLINE.split("-")[1]}</span>
        </h1>

        <p className="animate-fade-up-delay-2 mt-7 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Akses <strong className="text-foreground">2 model AI premium</strong> dengan 1 API key.
          Bayar sesuai paket, pakai sampai token habis. Endpoint kompatibel penuh dengan SDK OpenAI.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up-delay-3 mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/pricing"
            className="group bg-white text-black px-8 py-3.5 rounded-xl font-semibold hover:bg-foreground/90 transition shadow-lg shadow-white/10 flex items-center gap-2 hover:-translate-y-0.5"
          >
            Lihat Paket
            <Icon name="arrow" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/register"
            className="border px-8 py-3.5 rounded-xl font-semibold hover:bg-muted transition hover:-translate-y-0.5"
          >
            Daftar Gratis
          </Link>
        </div>

        {/* Stats strip */}
        <div className="animate-fade-up-delay-4 mt-20 grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { v: "2", l: "Model AI" },
            { v: "1M", l: "Context Window" },
            { v: "14hr", l: "Berlaku" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold gradient-text">{s.v}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Terminal mockup */}
        <div className="animate-fade-up-delay-4 mt-14 max-w-2xl mx-auto">
          <div className="glow-card rounded-xl border border-foreground/10 bg-muted/40 backdrop-blur shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-foreground/5">
              <span className="w-3 h-3 rounded-full bg-neutral-600" />
              <span className="w-3 h-3 rounded-full bg-neutral-500" />
              <span className="w-3 h-3 rounded-full bg-neutral-400" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">curl · one-router</span>
            </div>
            <pre className="text-left text-xs sm:text-sm font-mono p-5 overflow-x-auto leading-relaxed">
<span className="text-muted-foreground"># Buat request seperti OpenAI</span>{"\n"}
<span className="text-foreground">curl</span> https://onerouter.id/v1/chat/completions \{"\n"}
  -H <span className="text-foreground">"Authorization: Bearer or-xxxx"</span> \{"\n"}
  -H <span className="text-foreground">"Content-Type: application/json"</span> \{"\n"}
  -d <span className="text-foreground">{`'{ "model": "glm-5.2", ... }'`}</span>{"\n"}
<span className="text-foreground">{"{"}</span> <span className="text-muted-foreground">"role"</span>: <span className="text-foreground">"assistant"</span>, <span className="text-muted-foreground">"content"</span>: <span className="text-foreground">"Halo!"</span> <span className="text-foreground">{"}"}</span>
<span className="animate-blink text-foreground">▋</span>
            </pre>
          </div>
        </div>
      </section>

      {/* ===== FEATURES (Bento) ===== */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fitur</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2">Kenapa pilih {APP_NAME}?</h2>
          <p className="text-muted-foreground mt-3">
            Sederhana, cepat, dan hemat untuk developer Indonesia
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: "key", t: "1 API Key, 2 Model", d: "Tak perlu daftar banyak layanan. Satu key akses semua model premium." },
            { icon: "wallet", t: "Bayar Sesuai Pakai", d: "Beli token sesuai kebutuhan. Tak ada langganan bulanan yang mubazir." },
            { icon: "bolt", t: "Endpoint Kompatibel", d: "Drop-in replacement SDK OpenAI. Ganti base URL, langsung jalan." },
            { icon: "shield", t: "Aman & Privat", d: "Autentikasi NextAuth, API key terenkripsi. Data kamu milik kamu." },
            { icon: "mapPin", t: "Pembayaran Lokal", d: "Transfer bank & upload bukti. Tanpa kartu kredit asing." },
            { icon: "rocket", t: "Aktivasi Cepat", d: "Admin verifikasi lalu API key aktif instan di dashboard." },
          ].map((f) => (
            <div
              key={f.t}
              className="group border border-foreground/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-foreground/25 hover:shadow-xl hover:shadow-white/5 transition-all duration-300 bg-muted/30"
            >
              <div className="text-foreground mb-4 group-hover:scale-110 transition-transform">
                <Icon name={f.icon} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== MODELS ===== */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Model</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2">
            2 Model AI <span className="gradient-text">Premium</span>
          </h2>
          <p className="text-muted-foreground mt-3">
            Semua model bisa dipakai dengan API key yang sama
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {SUPPORTED_MODELS.map((m) => (
            <div
              key={m.id}
              className="group relative border border-foreground/10 rounded-2xl p-8 hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-muted/30 hover:shadow-2xl hover:shadow-white/5"
            >
              <div
                className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white opacity-[0.03] group-hover:opacity-[0.08] blur-2xl transition duration-500"
                aria-hidden
              />
              <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl border border-foreground/20 text-foreground font-bold text-xl mb-5">
                {modelLetter[m.id] ?? m.name.charAt(0)}
              </div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-xl">{m.name}</h3>
                <span className="text-xs px-2.5 py-1 rounded-full border border-foreground/15 text-muted-foreground font-mono">
                  {m.contextWindow} ctx
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>
              <code className="text-xs block mt-5 px-3 py-2 rounded-lg bg-background/50 border border-foreground/10 font-mono text-foreground">
                {m.id}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Harga</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2">Paket Langganan</h2>
          <p className="text-muted-foreground mt-3">
            Pilih sesuai kebutuhan, semua aktif 14 hari
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {packages.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl p-7 pt-8 flex flex-col transition-all duration-300 overflow-visible ${
                p.highlight
                  ? "glow-card shadow-2xl shadow-white/10 scale-[1.03] bg-muted/40"
                  : "border border-foreground/10 hover:-translate-y-1 hover:border-foreground/25 hover:shadow-xl hover:shadow-white/5 bg-muted/30"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                  Populer
                </span>
              )}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
              <div className="mt-5">
                <span className="text-4xl font-bold">{formatRupiah(p.price)}</span>
                <span className="text-muted-foreground text-sm"> / 14 hari</span>
              </div>
              <div className="mt-1 text-sm font-semibold gradient-text">
                {formatToken(p.tokenQuota)} token
              </div>
              <ul className="mt-6 space-y-3 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border border-foreground/20 text-foreground flex items-center justify-center">
                      <Icon name="check" className="w-2.5 h-2.5" />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 text-xs text-muted-foreground">
                {p.stock > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    Stok: {p.stock} tersedia
                  </span>
                ) : (
                  <span className="text-foreground font-medium">Stok habis</span>
                )}
              </div>
              {p.stock > 0 ? (
                <Link
                  href={`/checkout/${p.id}`}
                  className={`mt-5 block text-center py-3 rounded-xl font-semibold transition ${
                    p.highlight
                      ? "bg-white text-black hover:bg-foreground/90 shadow-lg shadow-white/10"
                      : "border hover:bg-muted"
                  }`}
                >
                  Beli {p.name}
                </Link>
              ) : (
                <button
                  disabled
                  className="mt-5 block w-full text-center py-3 rounded-xl font-semibold border opacity-50 cursor-not-allowed"
                >
                  Habis
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== CARA KERJA ===== */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alur</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2">Cara Kerja</h2>
          <p className="text-muted-foreground mt-3">Mulai dalam 4 langkah mudah</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { n: 1, t: "Daftar & Pilih Paket", d: "Buat akun, pilih paket sesuai kebutuhan", icon: "user" },
            { n: 2, t: "Transfer & Konfirmasi", d: "Bayar via transfer, upload bukti", icon: "card" },
            { n: 3, t: "Dapat API Key", d: "Admin aktivasi, dapat API key instan", icon: "key" },
            { n: 4, t: "Pakai Endpoint", d: "Pakai endpoint OpenAI-compatible", icon: "rocket" },
          ].map((s, i) => (
            <div key={s.n} className="text-center relative">
              {i < 3 && (
                <div className="hidden md:block absolute top-7 left-[60%] w-full h-px border-t border-dashed border-foreground/20" aria-hidden />
              )}
              <div className="relative inline-flex">
                <div className="w-14 h-14 mx-auto rounded-2xl border border-foreground/20 text-foreground flex items-center justify-center mb-4">
                  <Icon name={s.icon} />
                </div>
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border border-foreground/30 text-foreground flex items-center justify-center text-xs font-bold">
                  {s.n}
                </span>
              </div>
              <h3 className="font-semibold mb-1">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA BAND ===== */}
      <section className="container mx-auto px-4 py-20">
        <div className="relative rounded-3xl overflow-hidden border border-foreground/15 p-12 sm:p-16 text-center bg-muted/40">
          <div className="absolute inset-0 -z-10 grid-bg opacity-50" aria-hidden />
          <div
            className="absolute inset-0 -z-10"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04), transparent 70%)" }}
            aria-hidden
          />
          <h2 className="text-3xl sm:text-4xl font-bold">
            Siap mulai pakai AI premium?
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Daftar sekarang, dapat API key dalam hitungan menit setelah pembayaran.
          </p>
          <Link
            href="/register"
            className="inline-block mt-8 bg-white text-black px-8 py-3.5 rounded-xl font-semibold hover:scale-105 transition shadow-xl shadow-white/10"
          >
            Daftar Sekarang →
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-foreground/5 mt-8">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-bold">
              <span className="bg-white text-black px-2 py-0.5 rounded text-xs font-mono font-bold">
                1R
              </span>
              <span className="gradient-text">{APP_NAME}</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {APP_TAGLINE} · {new Date().getFullYear()}
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by OpenAI-compatible API
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
