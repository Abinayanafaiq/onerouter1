export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  publishedAt: string;
  updatedAt: string;
  category: string;
  readingMinutes: number;
  sections: { heading: string; paragraphs: string[] }[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "api-model-ai-murah-indonesia",
    title: "API Model AI Murah di Indonesia: Panduan Lengkap 2026",
    description:
      "Cari API model AI murah di Indonesia? Bandingkan harga token, cara bayar per token, dan tips memilih gateway kompatibel OpenAI tanpa langganan mahal.",
    keywords: [
      "API model murah",
      "API model AI murah",
      "token AI murah",
      "API AI Indonesia",
      "bayar per token",
    ],
    publishedAt: "2026-07-01",
    updatedAt: "2026-07-15",
    category: "Panduan",
    readingMinutes: 8,
    sections: [
      {
        heading: "Mengapa developer mencari API model murah?",
        paragraphs: [
          "Banyak tim di Indonesia membangun chatbot, asisten internal, dan fitur AI di produk SaaS. Tantangannya: biaya provider frontier bisa melonjak cepat, terutama jika memakai langganan bulanan atau multi-provider dengan invoice terpisah.",
          "API model AI murah tidak berarti model berkualitas rendah. Yang dibutuhkan adalah gateway transparan: harga per token jelas, bayar sesuai pemakaian, dan satu endpoint untuk banyak model.",
        ],
      },
      {
        heading: "Apa arti bayar per token?",
        paragraphs: [
          "Dengan model bayar per token, Anda hanya dikenai biaya untuk input dan output yang benar-benar dikirim/diterima. Tidak ada minimum seat, tidak ada biaya platform tersembunyi.",
          "Di 9inference, unit kredit disebut TOKS. 1 TOKS = Rp1.000. Setiap model punya tarif input/output per 1 juta token dalam rupiah, sehingga mudah dihitung untuk budgeting startup maupun agency.",
        ],
      },
      {
        heading: "Cara memilih API model AI murah yang aman",
        paragraphs: [
          "Pilih provider yang kompatibel OpenAI SDK agar migrasi cepat. Pastikan ada rate limit per API key, logging pemakaian, dan opsi isi saldo lokal (QRIS/transfer).",
          "Cek juga failover, status maintenance model, dan dokumentasi yang jelas. Harga murah tanpa keandalan justru mahal di produksi.",
        ],
      },
      {
        heading: "Mulai hemat dengan 9inference",
        paragraphs: [
          "9inference menggabungkan DeepSeek, GLM, Qwen, Kimi, dan model lain di satu API key. Daftar gratis, isi saldo seperlunya, lalu panggil model lewat endpoint OpenAI-compatible.",
          "Lihat katalog model dan harga terbaru, lalu bandingkan tarif input/output sebelum deploy ke production.",
        ],
      },
    ],
  },
  {
    slug: "deepseek-api-murah-cara-pakai",
    title: "DeepSeek API Murah: Cara Pakai via 9inference",
    description:
      "Pakai DeepSeek API murah tanpa ribet multi-provider. Panduan setup, contoh cURL/SDK, dan tips hemat token untuk production.",
    keywords: [
      "DeepSeek API murah",
      "DeepSeek API",
      "API DeepSeek Indonesia",
      "harga DeepSeek",
    ],
    publishedAt: "2026-07-03",
    updatedAt: "2026-07-15",
    category: "Tutorial",
    readingMinutes: 6,
    sections: [
      {
        heading: "Kenapa DeepSeek populer untuk biaya rendah?",
        paragraphs: [
          "DeepSeek dikenal kuat di penalaran dan coding dengan rasio harga/performa yang kompetitif. Banyak tim menggunakannya sebagai workhorse untuk agent, ringkasan dokumen, dan coding assistant.",
          "Masalahnya: mengelola akun provider terpisah, billing asing, dan integrasi berbeda-beda. Gateway terpadu menyederhanakan itu.",
        ],
      },
      {
        heading: "Setup DeepSeek lewat 9inference",
        paragraphs: [
          "Daftar akun 9inference, buat API key, lalu set base URL ke endpoint 9inference. Ganti parameter model ke ID DeepSeek yang tersedia di katalog.",
          "Karena kompatibel OpenAI, kode Node.js/Python yang sudah ada hampir tidak perlu diubah — cukup base URL dan API key.",
        ],
      },
      {
        heading: "Tips hemat token DeepSeek",
        paragraphs: [
          "Potong system prompt yang bertele-tele, batasi max_tokens, dan cache hasil yang berulang. Gunakan model lebih kecil untuk tugas sederhana.",
          "Pantau usage per model di dashboard agar Anda tahu mana workload yang memakan biaya paling besar.",
        ],
      },
    ],
  },
  {
    slug: "alternatif-openai-api-murah",
    title: "Alternatif OpenAI API Murah untuk Developer Indonesia",
    description:
      "Butuh alternatif OpenAI API murah? Bandingkan opsi model frontier, kompatibilitas SDK, dan strategi multi-model tanpa lock-in.",
    keywords: [
      "alternatif OpenAI murah",
      "OpenAI compatible API",
      "API AI murah",
      "ganti OpenAI",
    ],
    publishedAt: "2026-07-05",
    updatedAt: "2026-07-15",
    category: "Perbandingan",
    readingMinutes: 7,
    sections: [
      {
        heading: "Kapan perlu alternatif OpenAI?",
        paragraphs: [
          "Alasan umum: biaya, ketersediaan model regional, atau kebutuhan diversifikasi provider. Tim yang mature biasanya tidak bergantung pada satu model saja.",
          "Alternatif terbaik mempertahankan kompatibilitas API agar biaya migrasi mendekati nol.",
        ],
      },
      {
        heading: "Yang harus ada di alternatif OpenAI",
        paragraphs: [
          "Endpoint chat completions, streaming, daftar model, auth via Bearer token, dan dokumentasi contoh SDK. Idealnya ada billing transparan dalam IDR.",
          "9inference dirancang sebagai drop-in: ganti base URL, pilih model (DeepSeek, GLM, Qwen, Kimi, dll.), tetap pakai OpenAI SDK.",
        ],
      },
      {
        heading: "Strategi multi-model hemat biaya",
        paragraphs: [
          "Pakai model mahal hanya untuk tugas kritis; model murah untuk klasifikasi, rewrite, atau draft. Routing berdasarkan jenis request menghemat puluhan persen bulanan.",
          "Dengan satu key multi-model, eksperimen A/B model juga lebih cepat tanpa ganti kredensial.",
        ],
      },
    ],
  },
  {
    slug: "glm-qwen-api-harga-token",
    title: "GLM & Qwen API: Harga Token dan Kapan Memakainya",
    description:
      "Pelajari kapan memakai GLM atau Qwen API, bagaimana membaca harga token per 1 juta, dan cara menghitung biaya estimasi workload.",
    keywords: [
      "GLM API murah",
      "Qwen API murah",
      "harga token AI",
      "GLM API",
      "Qwen API",
    ],
    publishedAt: "2026-07-08",
    updatedAt: "2026-07-15",
    category: "Harga",
    readingMinutes: 6,
    sections: [
      {
        heading: "GLM vs Qwen secara praktis",
        paragraphs: [
          "GLM sering dipilih untuk penalaran dan coding; Qwen unggul di multilingual dan task umum. Keduanya tersedia lewat gateway 9inference dengan harga per token yang transparan.",
          "Pilih berdasarkan benchmark internal Anda, bukan hanya harga termurah di kertas.",
        ],
      },
      {
        heading: "Cara membaca harga per 1 juta token",
        paragraphs: [
          "Harga input dan output biasanya berbeda. Output sering lebih mahal. Estimasi biaya = (token input × tarif input) + (token output × tarif output).",
          "Di 9inference tarif ditampilkan dalam rupiah per 1 juta token, plus konversi ke TOKS agar mudah di-top-up.",
        ],
      },
      {
        heading: "Hitung estimasi bulanan",
        paragraphs: [
          "Catat rata-rata token per request × jumlah request/hari. Kalikan dengan tarif model terpilih. Sisakan buffer 20–30% untuk spike traffic.",
          "Gunakan halaman pricing dan katalog model untuk membandingkan opsi sebelum commit ke production.",
        ],
      },
    ],
  },
  {
    slug: "bayar-per-token-vs-langganan",
    title: "Bayar Per Token vs Langganan: Mana Lebih Hemat?",
    description:
      "Bandingkan bayar per token vs langganan AI. Kapan prepaid token lebih murah, kapan fixed plan masuk akal, dan tips kontrol biaya.",
    keywords: [
      "bayar per token",
      "langganan AI",
      "biaya API AI",
      "token AI murah",
    ],
    publishedAt: "2026-07-10",
    updatedAt: "2026-07-15",
    category: "Bisnis",
    readingMinutes: 5,
    sections: [
      {
        heading: "Langganan cocok kapan?",
        paragraphs: [
          "Langganan tetap berguna jika traffic sangat stabil dan provider memberi kuota yang hampir selalu terpakai penuh. Di luar itu, sisa kuota sering terbuang.",
          "Untuk startup dan product experiment, fixed plan bisa membebani cashflow di bulan sepi.",
        ],
      },
      {
        heading: "Keunggulan bayar per token",
        paragraphs: [
          "Biaya mengikuti pemakaian nyata. Mudah scale up/down. Cocok multi-model karena Anda tidak bayar seat per provider.",
          "9inference memakai model prepaid TOKS: isi saldo, pakai seperlunya, kredit tidak memaksa langganan bulanan.",
        ],
      },
      {
        heading: "Kontrol biaya di production",
        paragraphs: [
          "Set rate limit per API key, pantau usage, dan pisahkan key untuk staging vs production. Matikan model yang tidak dipakai.",
          "Kombinasikan model murah untuk volume tinggi dan model premium untuk edge case agar total cost of ownership tetap rendah.",
        ],
      },
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
