/**
 * Menambahkan model glm-5.3 ke katalog (additive-only, production-safe).
 *
 * Yang dilakukan:
 *   1. UPSERT AIModel "glm-5.3"      (katalog PAYG — harga 0, diisi via admin)
 *   2. UPSERT PackageModel "glm-5.3" (katalog endpoint /v1/package)
 *   3. CREATE 2 Package "GLM 5.3"    (28 Jt/Rp18.000 & 60 Jt/Rp35.000, 7 hari)
 *      — hanya jika belum ada paket serupa (idempotent, tidak duplikat)
 *
 * Yang TIDAK dilakukan: mengubah/menghapus model, paket, order, atau key
 * yang sudah ada.
 *
 * Jalankan: node scripts/add-glm-53.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const MODEL_ID = 'glm-5.3';

const PACKAGE_VARIANTS = [
  {
    name: 'GLM 5.3',
    description: 'GLM 5.3 — cocok untuk coding & reasoning tingkat lanjut',
    tokenQuota: 28000000n,
    price: 18000,
    durationDays: 7,
    stock: 10,
  },
  {
    name: 'GLM 5.3',
    description: 'GLM 5.3 — kuota lebih besar untuk pemakaian intensif',
    tokenQuota: 60000000n,
    price: 35000,
    durationDays: 7,
    stock: 10,
  },
];

(async () => {
  // --- 1. PAYG catalog (AIModel) ---
  const aiModel = await p.aIModel.upsert({
    where: { modelId: MODEL_ID },
    update: {
      masterId: MODEL_ID,
      name: 'GLM 5.3',
      provider: 'GLM',
      description: 'GLM 5.3 — model flagship GLM untuk reasoning & coding',
      contextWindow: '1M',
      supportsText: true,
      supportsImages: false,
      supportsStreaming: true,
      sort: 19,
      // Harga (inputPricePerMillion/outputPricePerMillion), enabled &
      // maintenanceMode SENGAJA tidak disentuh di update — kalau row sudah
      // ada, konfigurasi admin jangan ditimpa.
    },
    create: {
      modelId: MODEL_ID,
      masterId: MODEL_ID,
      name: 'GLM 5.3',
      provider: 'GLM',
      description: 'GLM 5.3 — model flagship GLM untuk reasoning & coding',
      contextWindow: '1M',
      inputPricePerMillion: 0, // diisi via admin dashboard
      outputPricePerMillion: 0,
      supportsText: true,
      supportsImages: false,
      supportsStreaming: true,
      enabled: true,
      maintenanceMode: false,
      sort: 19,
    },
  });
  console.log(`[1/3] AIModel PAYG: ${aiModel.modelId} (enabled=${aiModel.enabled}, harga input=${aiModel.inputPricePerMillion} output=${aiModel.outputPricePerMillion})`);

  // --- 2. Package catalog (PackageModel) ---
  const pkgModel = await p.packageModel.upsert({
    where: { modelId: MODEL_ID },
    update: {
      upstreamId: MODEL_ID,
      name: 'GLM 5.3',
      provider: 'GLM',
      // enabled & supportsStreaming tidak ditimpa bila sudah ada.
    },
    create: {
      modelId: MODEL_ID,
      upstreamId: MODEL_ID,
      name: 'GLM 5.3',
      provider: 'GLM',
      enabled: true,
      supportsStreaming: true,
      sort: 5,
    },
  });
  console.log(`[2/3] PackageModel: ${pkgModel.modelId} -> upstream ${pkgModel.upstreamId} (enabled=${pkgModel.enabled})`);

  // --- 3. Paket TOKEN_PACKAGE khusus glm-5.3 (create hanya jika belum ada) ---
  for (const v of PACKAGE_VARIANTS) {
    const existing = await p.package.findFirst({
      where: {
        name: v.name,
        tokenQuota: v.tokenQuota,
        productType: 'TOKEN_PACKAGE',
        allowedModels: { has: MODEL_ID },
      },
    });
    if (existing) {
      console.log(`[3/3] SKIP (sudah ada): paket "${v.name}" ${v.tokenQuota} token id=${existing.id}`);
      continue;
    }
    const created = await p.package.create({
      data: {
        name: v.name,
        description: v.description,
        tokenQuota: v.tokenQuota,
        price: v.price,
        durationDays: v.durationDays,
        isActive: true,
        sort: 0,
        stock: v.stock,
        productType: 'TOKEN_PACKAGE',
        allowedModels: [MODEL_ID],
      },
    });
    console.log(`[3/3] CREATE paket "${created.name}" ${created.tokenQuota} token, Rp${created.price}, stok ${created.stock} -> id=${created.id}`);
  }

  // --- Verifikasi akhir ---
  const [checkA, checkB, checkC] = await Promise.all([
    p.aIModel.findUnique({ where: { modelId: MODEL_ID } }),
    p.packageModel.findUnique({ where: { modelId: MODEL_ID } }),
    p.package.findMany({ where: { allowedModels: { has: MODEL_ID } } }),
  ]);
  console.log('=== VERIFIKASI ===');
  console.log('AIModel:', checkA ? `${checkA.modelId} enabled=${checkA.enabled}` : 'TIDAK ADA');
  console.log('PackageModel:', checkB ? `${checkB.modelId} enabled=${checkB.enabled}` : 'TIDAK ADA');
  console.log(`Package GLM 5.3: ${checkC.length} varian ->`, checkC.map((x) => `${x.id} (${x.tokenQuota} token, Rp${x.price}, stok ${x.stock})`));

  await p.$disconnect();
})().catch(async (e) => {
  console.error('GAGAL:', e);
  await p.$disconnect();
  process.exit(1);
});
