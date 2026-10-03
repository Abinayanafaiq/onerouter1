/**
 * Menambahkan model gemini-3.8-flash-high ke katalog (additive-only, production-safe).
 *
 * Yang dilakukan:
 *   1. UPSERT AIModel "gemini-3.8-flash-high"      (katalog PAYG — harga 0, diisi via admin)
 *   2. UPSERT PackageModel "gemini-3.8-flash-high" (katalog endpoint /v1/package)
 *
 * Catatan production:
 *   - Row dibuat dengan enabled=false — admin mengisi harga lalu meng-enable
 *     via dashboard. Tidak ada pemakaian gratis.
 *   - Routing ke backup upstream dikontrol oleh BACKUP_UPSTREAM_MODEL_MAP di
 *     app/lib/constants.ts (kode, bukan DB) + env BACKUP_API_KEY.
 *   - Jika row sudah ada, harga / enabled / maintenanceMode TIDAK ditimpa.
 *
 * Yang TIDAK dilakukan: mengubah/menghapus model, paket, order, atau key
 * yang sudah ada. Tidak membuat paket token baru (keputusan harga via admin).
 *
 * Jalankan: node scripts/add-gemini-38-flash-high.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const MODEL_ID = 'gemini-3.8-flash-high';

(async () => {
  // --- 1. PAYG catalog (AIModel) ---
  const aiModel = await p.aIModel.upsert({
    where: { modelId: MODEL_ID },
    update: {
      masterId: MODEL_ID,
      name: 'Gemini 3.8 Flash High',
      provider: 'Google',
      description: 'Gemini 3.8 Flash High — model cepat Google untuk tugas harian',
      supportsText: true,
      supportsImages: true,
      supportsStreaming: true,
      sort: 20,
      // Harga (inputPricePerMillion/outputPricePerMillion), contextWindow,
      // enabled & maintenanceMode SENGAJA tidak disentuh di update — kalau row
      // sudah ada, konfigurasi admin jangan ditimpa.
    },
    create: {
      modelId: MODEL_ID,
      masterId: MODEL_ID,
      name: 'Gemini 3.8 Flash High',
      provider: 'Google',
      description: 'Gemini 3.8 Flash High — model cepat Google untuk tugas harian',
      contextWindow: null, // belum dipublikasikan upstream — isi via admin dashboard
      inputPricePerMillion: 0, // diisi via admin dashboard
      outputPricePerMillion: 0,
      supportsText: true,
      supportsImages: true, // terverifikasi live di backup upstream (vision OK)
      supportsStreaming: true,
      enabled: false, // PRODUCTION: admin enable setelah harga diisi
      maintenanceMode: false,
      sort: 20,
    },
  });
  console.log(`[1/2] AIModel PAYG: ${aiModel.modelId} (enabled=${aiModel.enabled}, harga input=${aiModel.inputPricePerMillion} output=${aiModel.outputPricePerMillion})`);

  // --- 2. Package catalog (PackageModel) ---
  const pkgModel = await p.packageModel.upsert({
    where: { modelId: MODEL_ID },
    update: {
      upstreamId: MODEL_ID,
      name: 'Gemini 3.8 Flash High',
      provider: 'Google',
      // enabled & supportsStreaming tidak ditimpa bila sudah ada.
    },
    create: {
      modelId: MODEL_ID,
      upstreamId: MODEL_ID,
      name: 'Gemini 3.8 Flash High',
      provider: 'Google',
      enabled: false, // PRODUCTION: admin enable setelah siap
      supportsStreaming: true,
      sort: 24,
    },
  });
  console.log(`[2/2] PackageModel: ${pkgModel.modelId} -> upstream ${pkgModel.upstreamId} (enabled=${pkgModel.enabled})`);

  // --- Verifikasi akhir ---
  const [checkA, checkB] = await Promise.all([
    p.aIModel.findUnique({ where: { modelId: MODEL_ID } }),
    p.packageModel.findUnique({ where: { modelId: MODEL_ID } }),
  ]);
  console.log('=== VERIFIKASI ===');
  console.log('AIModel:', checkA ? `${checkA.modelId} enabled=${checkA.enabled} provider=${checkA.provider}` : 'TIDAK ADA');
  console.log('PackageModel:', checkB ? `${checkB.modelId} enabled=${checkB.enabled} provider=${checkB.provider}` : 'TIDAK ADA');

  await p.$disconnect();
})().catch(async (e) => {
  console.error('GAGAL:', e);
  await p.$disconnect();
  process.exit(1);
});
