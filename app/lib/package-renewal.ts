import { prisma } from "./prisma";

/**
 * Validasi target perpanjangan (renew) paket token.
 *
 * Order renew adalah order biasa yang kolom `apiKeyId`-nya sudah terisi sejak
 * dibuat — menunjuk key paket lama milik user. approvePaidOrder() mendeteksi
 * ini dan MEMPERPANJANG key tersebut (kuota + masa aktif ditambah) alih-alih
 * menerbitkan key baru, jadi user tidak perlu mengganti konfigurasi API key
 * di aplikasi mereka.
 *
 * Syarat sah:
 *  - key ada, milik user ini, dan bertipe TOKEN_PACKAGE;
 *  - key memang diterbitkan dari order paket (bukan key PAYG bikinan sendiri);
 *  - paket yang sedang di-checkout sama dengan paket asal key tersebut.
 */
export async function validateRenewalKey(params: {
  userId: string;
  apiKeyId: string;
  packageId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = await prisma.apiKey.findUnique({
    where: { id: params.apiKeyId },
    select: { id: true, userId: true, billingMode: true },
  });
  if (!key || key.userId !== params.userId || key.billingMode !== "TOKEN_PACKAGE") {
    return { ok: false, error: "API key paket tidak valid untuk diperpanjang" };
  }

  const source = await prisma.order.findFirst({
    where: { apiKeyId: key.id },
    orderBy: { createdAt: "asc" },
    select: { packageId: true },
  });
  if (!source) {
    return { ok: false, error: "API key ini tidak berasal dari pembelian paket" };
  }
  if (source.packageId !== params.packageId) {
    return { ok: false, error: "Paket tidak sesuai dengan API key yang diperpanjang" };
  }

  return { ok: true };
}
