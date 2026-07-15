import fs from "fs";

const path = "app/[locale]/page.tsx";
let c = fs.readFileSync(path, "utf8");
let n = 0;

const pairs = [
  [
    "Gateway inferensi kompatibel OpenAI untuk DeepSeek, GLM, Qwen, Kimi & lainnya.\n              Harga token transparan dalam rupiah — tanpa langganan, tanpa biaya tersembunyi.",
    '{t("subheadline")}',
  ],
  ["Mulai gratis — API key instan", '{t("ctaPrimary")}'],
  [
    "Setup &lt; 2 menit · Tanpa kartu kredit · Bayar per token",
    '{t("setupNote")}',
  ],
  [
    "Semua yang Anda butuhkan untuk merilis fitur AI andal — dari routing hingga billing —\n              di balik satu API yang prediktabel.",
    '{t("infraDesc")}',
  ],
  ["Katalog Model", '{t("catalogEyebrow")}'],
  ["Model frontier, siap dipanggil", '{t("catalogTitle")}'],
  [
    "{modelCount} model siap produksi dari provider terkemuka — semua di balik satu\n                API key, ditagih per token.",
    '{t("catalogDesc", { count: modelCount })}',
  ],
  ["Lihat semua model →", '{t("viewAllModelsArrow")}'],
  ["Katalog model sedang diperbarui.", '{t("catalogEmpty")}'],
  ["Harga sederhana berbasis pemakaian", '{t("pricingTitle")}'],
  [
    "Bayar hanya untuk token yang Anda pakai. Tanpa langganan. Tanpa biaya tersembunyi.",
    '{t("pricingDesc")}',
  ],
  [
    'Dibuat untuk developer yang membangun masa depan\n              <br className="hidden sm:block" /> aplikasi AI',
    '{t("trustTitle")}',
  ],
  ["Siap coba? Daftar gratis", '{t("ctaFinalTitle")}'],
  [
    "API model AI murah — bayar per token, kompatibel OpenAI, untuk developer Indonesia.",
    '{tf("tagline")}',
  ],
  [
    "© {new Date().getFullYear()} 9inference. Hak cipta dilindungi.",
    '{tf("copyright", { year: new Date().getFullYear() })}',
  ],
  [
    '            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">\n              Harga\n            </span>',
    '            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">\n              {t("pricingEyebrow")}\n            </span>',
  ],
  ['title="Platform"', "title={t(\"providersLabel\")}"],
  ['title="Belajar"', "title={tf(\"learn\")}"],
  ['title="Akun"', "title={tf(\"account\")}"],
  [
    '{ label: "Model AI Murah", href: "/models" }',
    '{ label: tf("aiModels"), href: "/models" }',
  ],
  [
    '{ label: "Harga Token", href: "/pricing" }',
    '{ label: tf("tokenPricing"), href: "/pricing" }',
  ],
  [
    '{ label: "Blog", href: "/blog" }',
    '{ label: tc("blog"), href: "/blog" }',
  ],
  [
    '{ label: "Dashboard", href: "/dashboard" }',
    '{ label: tc("dashboard"), href: "/dashboard" }',
  ],
  [
    '{ label: "API Model AI Murah", href: "/blog/api-model-ai-murah-indonesia" }',
    '{ label: tf("apiCheap"), href: "/blog/api-model-ai-murah-indonesia" }',
  ],
  [
    '{ label: "DeepSeek API Murah", href: "/blog/deepseek-api-murah-cara-pakai" }',
    '{ label: tf("deepseekCheap"), href: "/blog/deepseek-api-murah-cara-pakai" }',
  ],
  [
    '{ label: "Alternatif OpenAI", href: "/blog/alternatif-openai-api-murah" }',
    '{ label: tf("openaiAlt"), href: "/blog/alternatif-openai-api-murah" }',
  ],
  [
    '{ label: "Bayar Per Token", href: "/blog/bayar-per-token-vs-langganan" }',
    '{ label: tf("payPerToken"), href: "/blog/bayar-per-token-vs-langganan" }',
  ],
  [
    '{ label: "Masuk", href: "/login" }',
    '{ label: tc("login"), href: "/login" }',
  ],
  [
    '{ label: "Daftar gratis", href: "/register" }',
    '{ label: tc("register"), href: "/register" }',
  ],
  [
    '{ label: "Isi Saldo", href: "/dashboard/wallet" }',
    '{ label: tc("topUp"), href: "/dashboard/wallet" }',
  ],
  [
    "<PremiumPricingTable models={models} />",
    "<PremiumPricingTable models={models} t={t} tc={tc} />",
  ],
  ["<AnimatedStats />", "<AnimatedStats labels={[t('statModels'), t('statContext'), t('statLatency'), t('statUptime')]} />"],
];

for (const [a, b] of pairs) {
  if (c.includes(a)) {
    c = c.replace(a, b);
    n++;
    console.log("ok", a.slice(0, 50));
  } else {
    console.log("MISS", a.slice(0, 60));
  }
}

// Update PremiumPricingTable function to accept t/tc and use them
c = c.replace(
  "function PremiumPricingTable({ models }: { models: ModelCardData[] }) {",
  "function PremiumPricingTable({ models, t, tc }: { models: ModelCardData[]; t: (k: string) => string; tc: (k: string) => string }) {",
);

// Fix capabilityLabel call if present
if (c.includes("capabilityLabel(m.name, m.modelId)")) {
  c = c.replace(
    "capabilityLabel(m.name, m.modelId)",
    "capabilityLabel(m.name, m.modelId, capLabels)",
  );
}

fs.writeFileSync(path, c);
console.log("total", n);
