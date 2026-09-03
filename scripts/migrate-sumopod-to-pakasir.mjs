/**
 * Migrasi payment gateway: Sumopod -> Pakasir (one-off, production-safe).
 *
 * Yang dilakukan (HANYA menyentuh tabel Setting):
 *   1. UPSERT pakasir_slug     = nilai dari env PAKASIR_SLUG
 *   2. UPSERT pakasir_api_key  = nilai dari env PAKASIR_API_KEY
 *   3. UPDATE sumopod_api_key  = "" (menonaktifkan Sumopod; row TIDAK dihapus)
 *
 * Yang TIDAK dilakukan: menghapus/mengubah order, wallet, user, atau data lain.
 *
 * Cara pakai:
 *   $env:PAKASIR_SLUG="..."; $env:PAKASIR_API_KEY="..."; node scripts/migrate-sumopod-to-pakasir.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function mask(v) {
  if (!v) return "(kosong)";
  if (v.length <= 8) return "*".repeat(v.length);
  return `${v.slice(0, 4)}${"*".repeat(v.length - 8)}${v.slice(-4)}`;
}

async function main() {
  const slug = (process.env.PAKASIR_SLUG || "").trim();
  const apiKey = (process.env.PAKASIR_API_KEY || "").trim();
  if (!slug || !apiKey) {
    throw new Error("Env PAKASIR_SLUG dan PAKASIR_API_KEY wajib diisi");
  }

  // --- Audit: catat kondisi sebelum (masked) ---
  const before = await prisma.setting.findMany({
    where: { key: { in: ["pakasir_slug", "pakasir_api_key", "sumopod_api_key"] } },
  });
  console.log("=== SEBELUM ===");
  for (const row of before) console.log(`  ${row.key} = ${mask(row.value)}`);

  // --- 1 & 2: upsert konfigurasi Pakasir ---
  await prisma.setting.upsert({
    where: { key: "pakasir_slug" },
    update: { value: slug },
    create: { key: "pakasir_slug", value: slug },
  });
  await prisma.setting.upsert({
    where: { key: "pakasir_api_key" },
    update: { value: apiKey },
    create: { key: "pakasir_api_key", value: apiKey },
  });
  console.log("=== UPSERT pakasir_slug & pakasir_api_key: OK ===");

  // --- 3: nonaktifkan Sumopod (kosongkan api key, row tetap ada) ---
  const sumopod = await prisma.setting.findUnique({ where: { key: "sumopod_api_key" } });
  if (sumopod && sumopod.value !== "") {
    await prisma.setting.update({
      where: { key: "sumopod_api_key" },
      data: { value: "" },
    });
    console.log("=== sumopod_api_key dikosongkan (Sumopod nonaktif) ===");
  } else {
    console.log("=== sumopod_api_key sudah kosong / tidak ada — dilewati ===");
  }

  // --- Verifikasi akhir (masked) ---
  const after = await prisma.setting.findMany({
    where: { key: { in: ["pakasir_slug", "pakasir_api_key", "sumopod_api_key"] } },
  });
  console.log("=== SESUDAH ===");
  for (const row of after) console.log(`  ${row.key} = ${mask(row.value)}`);
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
