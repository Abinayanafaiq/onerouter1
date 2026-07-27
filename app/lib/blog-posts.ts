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
  {
    slug: "cara-pakai-api-openai-compatible",
    title: "Cara Pakai API Kompatibel OpenAI: Setup 5 Menit",
    description:
      "Panduan lengkap cara pakai API kompatibel OpenAI: ganti base URL, pakai OpenAI SDK, dan contoh kode Python & Node.js yang bisa langsung jalan.",
    keywords: [
      "API kompatibel OpenAI",
      "OpenAI compatible API",
      "cara pakai API AI",
      "OpenAI SDK",
      "chat completions API",
    ],
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    category: "Tutorial",
    readingMinutes: 7,
    sections: [
      {
        heading: "Apa itu API kompatibel OpenAI?",
        paragraphs: [
          "API kompatibel OpenAI adalah endpoint yang mengikuti format request dan response yang sama dengan OpenAI (chat completions, streaming, dan daftar model). Artinya, kode yang sudah memakai OpenAI SDK bisa langsung dipakai tanpa menulis ulang logika.",
          "Keuntungannya besar: Anda bisa berpindah provider atau memakai gateway multi-model hanya dengan mengganti base URL dan API key.",
        ],
      },
      {
        heading: "Langkah setup di 9inference",
        paragraphs: [
          "Pertama, daftar akun 9inference lalu buat API key dari dashboard. Kedua, salin base URL endpoint 9inference. Ketiga, pilih ID model dari katalog, misalnya DeepSeek, GLM, atau Qwen.",
          "Tidak ada konfigurasi rumit. Jika Anda sudah pernah memakai OpenAI, pola yang sama persis berlaku di sini.",
        ],
      },
      {
        heading: "Contoh kode Python",
        paragraphs: [
          "Dengan library openai resmi, cukup set base_url ke endpoint 9inference dan api_key ke key Anda, lalu panggil client.chat.completions.create dengan model pilihan.",
          "Karena formatnya sama, fitur seperti streaming, system prompt, dan parameter temperature berfungsi normal.",
        ],
      },
      {
        heading: "Contoh kode Node.js",
        paragraphs: [
          "Untuk Node.js, inisialisasi OpenAI dengan baseURL 9inference. Panggil endpoint yang sama seperti biasa. Anda bisa mengganti model hanya dengan mengubah satu string.",
          "Tips: simpan API key di environment variable dan jangan commit ke repository publik.",
        ],
      },
      {
        heading: "Produksi: yang perlu diperhatikan",
        paragraphs: [
          "Pisahkan API key untuk staging dan production, aktifkan rate limit, dan pantau pemakaian token di dashboard agar biaya tetap terkendali.",
          "Dengan satu key multi-model, Anda bisa A/B test beberapa model tanpa mengelola banyak kredensial.",
        ],
      },
    ],
  },
  {
    slug: "qwen-api-murah-cara-pakai",
    title: "Qwen API Murah: Cara Pakai & Keunggulannya",
    description:
      "Pakai Qwen API murah lewat 9inference. Kenali keunggulan Qwen, cara setup, dan tips memilih varian yang tepat untuk workload Anda.",
    keywords: [
      "Qwen API murah",
      "Qwen API",
      "Alibaba Qwen API",
      "harga Qwen",
      "API Qwen Indonesia",
    ],
    publishedAt: "2026-07-20",
    updatedAt: "2026-07-20",
    category: "Tutorial",
    readingMinutes: 6,
    sections: [
      {
        heading: "Kenapa Qwen layak dipakai?",
        paragraphs: [
          "Qwen dari Alibaba dikenal kuat di tugas multilingual, penalaran, dan coding. Varian yang beragam membuatnya fleksibel: dari model kecil yang cepat hingga model besar untuk tugas kompleks.",
          "Bagi tim di Indonesia, Qwen menarik karena kualitas tinggi dengan harga token yang kompetitif dibanding model frontier lain.",
        ],
      },
      {
        heading: "Cara pakai Qwen lewat 9inference",
        paragraphs: [
          "Daftar akun, buat API key, lalu pilih ID model Qwen dari katalog 9inference. Karena endpoint kompatibel OpenAI, integrasi hampir instan.",
          "Anda bisa mengganti model Qwen dengan model lain kapan saja tanpa mengubah struktur kode — cukup ganti nama model.",
        ],
      },
      {
        heading: "Memilih varian Qwen yang tepat",
        paragraphs: [
          "Untuk chatbot ringan dan klasifikasi, varian kecil sudah cukup dan jauh lebih hemat. Untuk analisis dokumen panjang atau coding kompleks, pilih varian yang lebih besar.",
          "Bandingkan tarif input/output per 1 juta token di halaman pricing sebelum memutuskan, karena output biasanya lebih mahal daripada input.",
        ],
      },
      {
        heading: "Tips hemat biaya Qwen",
        paragraphs: [
          "Batasi max_tokens, ringkas konteks, dan gunakan prompt yang spesifik agar output tidak bertele-tele. Pantau usage per model di dashboard untuk menemukan bottleneck biaya.",
        ],
      },
    ],
  },
  {
    slug: "kimi-api-murah-cara-pakai",
    title: "Kimi API Murah: Cara Pakai Moonshot AI",
    description:
      "Pakai Kimi API murah dari Moonshot AI lewat 9inference. Panduan setup, keunggulan konteks panjang, dan tips penggunaan untuk production.",
    keywords: [
      "Kimi API murah",
      "Kimi API",
      "Moonshot AI API",
      "Kimi k2 API",
      "API Kimi Indonesia",
    ],
    publishedAt: "2026-07-22",
    updatedAt: "2026-07-22",
    category: "Tutorial",
    readingMinutes: 6,
    sections: [
      {
        heading: "Keunggulan Kimi dari Moonshot AI",
        paragraphs: [
          "Kimi terkenal dengan kemampuan konteks panjang dan kualitas penalaran yang solid, terutama untuk tugas membaca dokumen, ringkasan, dan coding.",
          "Lewat 9inference, Anda bisa memakai Kimi tanpa mengelola akun provider terpisah — cukup satu API key untuk semua model.",
        ],
      },
      {
        heading: "Setup Kimi dalam 5 menit",
        paragraphs: [
          "Buat API key di dashboard 9inference, set base URL ke endpoint 9inference, lalu pilih ID model Kimi dari katalog. Kode OpenAI SDK Anda langsung berfungsi.",
          "Cocok untuk yang ingin migrasi cepat dari provider lain tanpa menulis ulang integrasi.",
        ],
      },
      {
        heading: "Kapan memakai Kimi?",
        paragraphs: [
          "Gunakan Kimi untuk workload yang butuh konteks panjang: ringkasan dokumen legal, analisis kode besar, atau agen yang membaca banyak referensi sekaligus.",
          "Untuk tugas sederhana bervolume tinggi, kombinasikan dengan model yang lebih murah agar biaya bulanan tetap rendah.",
        ],
      },
      {
        heading: "Kontrol biaya",
        paragraphs: [
          "Konteks panjang berarti token input besar. Selalu pangkas konteks yang tidak perlu dan hitung estimasi biaya sebelum mengirim dokumen besar.",
        ],
      },
    ],
  },
  {
    slug: "glm-api-murah-cara-pakai",
    title: "GLM API Murah: Cara Pakai & Kapan Menggunakannya",
    description:
      "Pakai GLM API murah lewat 9inference. Kenali kekuatan GLM untuk penalaran dan coding, cara setup, dan strategi hemat token.",
    keywords: [
      "GLM API murah",
      "GLM API",
      "cara pakai GLM",
      "harga GLM API",
      "API GLM Indonesia",
    ],
    publishedAt: "2026-07-24",
    updatedAt: "2026-07-24",
    category: "Tutorial",
    readingMinutes: 6,
    sections: [
      {
        heading: "Apa itu GLM dan kelebihannya?",
        paragraphs: [
          "GLM adalah keluarga model AI yang kuat di penalaran logis, matematika, dan coding. Banyak tim memakai GLM untuk asisten coding, analisis data, dan agen multi-step.",
          "Dengan harga token yang kompetitif, GLM menjadi pilihan menarik untuk production yang sensitif biaya.",
        ],
      },
      {
        heading: "Cara pakai GLM lewat 9inference",
        paragraphs: [
          "Prosesnya sama dengan model lain: buat API key, arahkan base URL ke 9inference, lalu pilih ID model GLM dari katalog. Kompatibel penuh dengan OpenAI SDK.",
          "Anda dapat berpindah antar model GLM dan model lain hanya dengan mengganti nama model di request.",
        ],
      },
      {
        heading: "Use case yang cocok",
        paragraphs: [
          "GLM bersinar untuk tugas penalaran: chain-of-thought, debugging kode, dan pertanyaan analitis. Untuk tugas kreatif ringan, model lain bisa lebih hemat.",
          "Uji beberapa model dengan prompt nyata Anda, lalu pilih berdasarkan kualitas output per rupiah.",
        ],
      },
      {
        heading: "Strategi hemat token",
        paragraphs: [
          "Gunakan streaming untuk UX yang responsif, batasi max_tokens, dan cache jawaban untuk pertanyaan berulang. Pantau tarif input/output di halaman pricing.",
        ],
      },
    ],
  },
  {
    slug: "chatbot-whatsapp-ai-murah",
    title: "Cara Membuat Chatbot WhatsApp AI Murah",
    description:
      "Bangun chatbot WhatsApp AI murah dengan API model AI. Pelajari arsitektur, cara integrasi, dan tips menekan biaya token per percakapan.",
    keywords: [
      "chatbot WhatsApp AI",
      "chatbot AI murah",
      "buat chatbot WhatsApp",
      "API chatbot",
      "bot WhatsApp AI",
    ],
    publishedAt: "2026-07-26",
    updatedAt: "2026-07-26",
    category: "Use Case",
    readingMinutes: 8,
    sections: [
      {
        heading: "Kenapa chatbot WhatsApp penting untuk bisnis?",
        paragraphs: [
          "WhatsApp adalah kanal komunikasi terbesar di Indonesia. Chatbot AI di WhatsApp bisa menjawab pelanggan 24/7, kualifikasi lead, dan mengurangi beban tim CS.",
          "Kunci suksesnya adalah biaya per percakapan yang rendah — di sinilah API model AI murah berperan.",
        ],
      },
      {
        heading: "Arsitektur dasar chatbot WhatsApp AI",
        paragraphs: [
          "Alurnya: pesan masuk dari webhook WhatsApp → server Anda memanggil API model AI → balasan dikirim kembali ke pengguna. Model AI bertugas memahami pertanyaan dan menyusun jawaban.",
          "Gunakan endpoint kompatibel OpenAI agar integrasi cepat. 9inference menyediakan satu API key untuk banyak model, cocok untuk eksperimen kualitas jawaban.",
        ],
      },
      {
        heading: "Menekan biaya token per percakapan",
        paragraphs: [
          "Jangan kirim seluruh riwayat chat setiap pesan — ringkas konteks atau simpan hanya beberapa giliran terakhir. Gunakan system prompt yang ringkas dan to-the-point.",
          "Pilih model murah untuk FAQ umum, dan model lebih pintar hanya untuk pertanyaan kompleks. Strategi routing ini bisa memangkas biaya hingga 50% lebih.",
        ],
      },
      {
        heading: "Tips production",
        paragraphs: [
          "Sediakan fallback jawaban jika API timeout, batasi panjang jawaban, dan log setiap percakapan untuk evaluasi kualitas. Pisahkan API key untuk tiap environment.",
        ],
      },
    ],
  },
  {
    slug: "ai-agent-coding-api-murah",
    title: "Membangun AI Coding Agent dengan API Murah",
    description:
      "Buat AI coding agent yang kuat tanpa boros. Pelajari cara kerja coding agent, memilih model untuk tool calling, dan mengontrol biaya token.",
    keywords: [
      "AI coding agent",
      "coding assistant AI",
      "AI agent API",
      "tool calling AI",
      "API AI untuk coding",
    ],
    publishedAt: "2026-07-28",
    updatedAt: "2026-07-28",
    category: "Use Case",
    readingMinutes: 8,
    sections: [
      {
        heading: "Apa itu AI coding agent?",
        paragraphs: [
          "AI coding agent adalah sistem yang tidak hanya menjawab, tapi juga bertindak: membaca file, menulis kode, menjalankan perintah, dan memperbaiki error secara iteratif.",
          "Agen semacam ini bisa memanggil model berkali-kali dalam satu tugas, sehingga efisiensi token sangat menentukan biaya akhir.",
        ],
      },
      {
        heading: "Memilih model untuk coding agent",
        paragraphs: [
          "Pilih model yang kuat di coding dan penalaran, misalnya DeepSeek atau GLM. Untuk langkah sederhana (parsing, validasi), gunakan model yang lebih murah agar loop agen tidak boros.",
          "Dengan 9inference, Anda bisa mengganti model per langkah dalam satu API key — tidak perlu kredensial terpisah per provider.",
        ],
      },
      {
        heading: "Mengontrol biaya loop agen",
        paragraphs: [
          "Batasi jumlah iterasi maksimal, pangkas output tool yang panjang, dan gunakan ringkasan daripada menempelkan seluruh log. Setiap token yang dihemat berlipat ganda dalam loop.",
          "Pantau usage per request di dashboard untuk menemukan langkah agen yang paling mahal.",
        ],
      },
      {
        heading: "Praktik production",
        paragraphs: [
          "Sandbox eksekusi perintah agen, validasi output sebelum diterapkan, dan sediakan mode dry-run. Keamanan sama pentingnya dengan efisiensi biaya.",
        ],
      },
    ],
  },
  {
    slug: "rag-api-murah-panduan",
    title: "RAG dengan API AI Murah: Panduan Praktis",
    description:
      "Bangun sistem RAG (Retrieval-Augmented Generation) yang hemat biaya. Pelajari cara kerja RAG, strategi chunking, dan menekan biaya token retrieval.",
    keywords: [
      "RAG AI",
      "retrieval augmented generation",
      "RAG murah",
      "AI knowledge base",
      "chatbot dokumen",
    ],
    publishedAt: "2026-07-30",
    updatedAt: "2026-07-30",
    category: "Use Case",
    readingMinutes: 9,
    sections: [
      {
        heading: "Apa itu RAG dan kenapa penting?",
        paragraphs: [
          "RAG (Retrieval-Augmented Generation) menggabungkan pencarian dokumen dengan model AI. Alih-alih menghafal, model menjawab berdasarkan dokumen relevan yang diambil saat itu juga.",
          "Ini ideal untuk chatbot knowledge base, asisten internal perusahaan, dan Q&A atas dokumen pribadi — tanpa fine-tuning mahal.",
        ],
      },
      {
        heading: "Alur kerja RAG sederhana",
        paragraphs: [
          "Pertama, dokumen dipecah menjadi potongan (chunk) lalu disimpan di vector database. Saat pengguna bertanya, sistem mengambil chunk paling relevan, lalu mengirimnya ke model AI bersama pertanyaan.",
          "Model AI kemudian menjawab berdasarkan konteks tersebut. Endpoint kompatibel OpenAI di 9inference memudahkan langkah generasi ini.",
        ],
      },
      {
        heading: "Menekan biaya token di RAG",
        paragraphs: [
          "Biaya RAG didominasi token konteks yang dikirim ke model. Batasi jumlah chunk yang diambil (misalnya 3–5 teratas) dan pangkas chunk yang terlalu panjang.",
          "Gunakan model murah untuk menjawab pertanyaan sederhana, dan model premium hanya untuk pertanyaan yang butuh penalaran mendalam.",
        ],
      },
      {
        heading: "Kesalahan umum yang harus dihindari",
        paragraphs: [
          "Chunk terlalu besar membuat konteks tidak fokus dan boros token. Chunk terlalu kecil kehilangan makna. Eksperimen dengan ukuran chunk dan jumlah retrieval untuk kualitas terbaik per rupiah.",
        ],
      },
    ],
  },
  {
    slug: "cara-menghitung-biaya-token-ai",
    title: "Cara Menghitung Biaya Token AI untuk Budgeting",
    description:
      "Panduan menghitung biaya token AI secara akurat: rumus input/output, estimasi workload bulanan, dan tips menghemat budget API.",
    keywords: [
      "biaya token AI",
      "harga token AI",
      "cara hitung token",
      "budget API AI",
      "estimasi biaya AI",
    ],
    publishedAt: "2026-08-01",
    updatedAt: "2026-08-01",
    category: "Bisnis",
    readingMinutes: 7,
    sections: [
      {
        heading: "Memahami input dan output token",
        paragraphs: [
          "Setiap request AI terdiri dari token input (prompt + konteks) dan token output (jawaban model). Keduanya biasanya punya tarif berbeda, dan output sering lebih mahal.",
          "Di 9inference, tarif ditampilkan dalam rupiah per 1 juta token, sehingga mudah dihitung untuk budgeting.",
        ],
      },
      {
        heading: "Rumus dasar menghitung biaya",
        paragraphs: [
          "Biaya per request = (token input ÷ 1.000.000 × tarif input) + (token output ÷ 1.000.000 × tarif output). Kalikan dengan jumlah request per hari untuk estimasi harian, lalu per bulan.",
          "Contoh: 1.000 request/hari dengan rata-rata 1.000 token input dan 500 output akan jauh lebih murah di model ekonomis dibanding model premium.",
        ],
      },
      {
        heading: "Estimasi workload nyata",
        paragraphs: [
          "Ukur rata-rata token dari sampel request nyata Anda, bukan tebakan. Jalankan beberapa hari di staging, catat usage, lalu ekstrapolasi.",
          "Selalu tambahkan buffer 20–30% untuk lonjakan traffic dan variasi panjang jawaban.",
        ],
      },
      {
        heading: "Tips menghemat budget",
        paragraphs: [
          "Pangkas system prompt, batasi max_tokens, cache jawaban berulang, dan gunakan model termurah yang masih memenuhi standar kualitas Anda.",
          "Pantau usage per model di dashboard 9inference agar Anda tahu persis ke mana anggaran mengalir.",
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
