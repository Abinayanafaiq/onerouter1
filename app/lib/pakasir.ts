import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";
import { prisma } from "@/app/lib/prisma";

const PAKASIR_BASE_URL = "https://app.pakasir.com";

export const PAKASIR_PAYMENT_METHODS = [
  "qris",
  "cimb_niaga_va",
  "bni_va",
  "sampoerna_va",
  "bnc_va",
  "maybank_va",
  "permata_va",
  "atm_bersama_va",
  "artha_graha_va",
  "bri_va",
] as const;

export type PakasirMethod = (typeof PAKASIR_PAYMENT_METHODS)[number];

const SETTING_KEYS = {
  slug: "pakasir_slug",
  apiKey: "pakasir_api_key",
  webhookSecret: "pakasir_webhook_secret",
} as const;

export type PakasirSettings = {
  slug: string;
  apiKey: string;
  webhookSecret: string;
};

export async function getPakasirSettings(): Promise<PakasirSettings> {
  const keys = Object.values(SETTING_KEYS);
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    slug: map.get(SETTING_KEYS.slug) || "",
    apiKey: map.get(SETTING_KEYS.apiKey) || "",
    webhookSecret: map.get(SETTING_KEYS.webhookSecret) || "",
  };
}

export async function isPakasirConfigured(): Promise<boolean> {
  const { slug, apiKey } = await getPakasirSettings();
  return !!slug && !!apiKey;
}

export async function savePakasirSettings(input: Partial<PakasirSettings>): Promise<void> {
  const ops: Promise<unknown>[] = [];
  if (input.slug !== undefined) {
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.slug },
        update: { value: input.slug.trim() },
        create: { key: SETTING_KEYS.slug, value: input.slug.trim() },
      }),
    );
  }
  if (input.apiKey !== undefined) {
    const v = input.apiKey.trim();
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.apiKey },
        update: { value: v },
        create: { key: SETTING_KEYS.apiKey, value: v },
      }),
    );
  }
  if (input.webhookSecret !== undefined) {
    const v = input.webhookSecret.trim();
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.webhookSecret },
        update: { value: v },
        create: { key: SETTING_KEYS.webhookSecret, value: v },
      }),
    );
  }
  await Promise.all(ops);
}

export type PakasirPayment = {
  project: string;
  order_id: string;
  amount: number;
  fee: number;
  total_payment: number;
  payment_method: string;
  payment_number: string;
  expired_at: string;
};

export type PakasirCreateResult =
  | { ok: true; payment: PakasirPayment }
  | { ok: false; error: string };

export async function createTransaction(params: {
  method: PakasirMethod;
  orderId: string;
  amount: number;
}): Promise<PakasirCreateResult> {
  const { slug, apiKey } = await getPakasirSettings();
  if (!slug || !apiKey) {
    return { ok: false, error: "Pakasir belum dikonfigurasi. Isi slug & API key di pengaturan admin." };
  }
  try {
    const res = await fetch(`${PAKASIR_BASE_URL}/api/transactioncreate/${params.method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: slug,
        order_id: params.orderId,
        amount: params.amount,
        api_key: apiKey,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[pakasir] createTransaction failed:", res.status, text);
      return { ok: false, error: `Gagal membuat transaksi Pakasir (${res.status})` };
    }

    const data = (await res.json()) as { payment?: PakasirPayment; error?: string };
    if (!data.payment) {
      return { ok: false, error: data.error || "Response Pakasir tidak valid" };
    }
    return { ok: true, payment: data.payment };
  } catch (e) {
    console.error("[pakasir] createTransaction exception:", e);
    return { ok: false, error: "Koneksi ke Pakasir gagal" };
  }
}

export type PakasirTransactionDetail = {
  amount: number;
  order_id: string;
  project: string;
  status: string;
  payment_method: string;
  completed_at: string | null;
};

export async function getTransactionDetail(params: {
  orderId: string;
  amount: number;
}): Promise<{ ok: true; transaction: PakasirTransactionDetail } | { ok: false; error: string }> {
  const { slug, apiKey } = await getPakasirSettings();
  if (!slug || !apiKey) {
    return { ok: false, error: "Pakasir belum dikonfigurasi" };
  }
  try {
    const url = new URL(`${PAKASIR_BASE_URL}/api/transactiondetail`);
    url.searchParams.set("project", slug);
    url.searchParams.set("amount", String(params.amount));
    url.searchParams.set("order_id", params.orderId);
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, error: `Gagal cek status (${res.status})` };
    }
    const data = (await res.json()) as { transaction?: PakasirTransactionDetail; error?: string };
    if (!data.transaction) {
      return { ok: false, error: data.error || "Transaksi tidak ditemukan" };
    }
    return { ok: true, transaction: data.transaction };
  } catch (e) {
    console.error("[pakasir] getTransactionDetail exception:", e);
    return { ok: false, error: "Koneksi ke Pakasir gagal" };
  }
}

/**
 * Fallback untuk mendeteksi apakah transaksi URL-integration sudah completed.
 *
 * Pakasir's transactiondetail API tidak bisa menemukan transaksi yang dibuat
 * via URL integration (returns 404). Tapi transactioncreate API bisa detect
 * bahwa transaksi sudah ada dengan return "Transaction already completed".
 *
 * Function ini memanggil transactioncreate dengan order_id yang sudah ada.
 * Jika response mengandung "already completed", transaksi sudah dibayar.
 */
export async function checkTransactionCompletedViaCreate(params: {
  orderId: string;
  amount: number;
}): Promise<{ completed: boolean; error?: string }> {
  const { slug, apiKey } = await getPakasirSettings();
  if (!slug || !apiKey) {
    return { completed: false, error: "Pakasir belum dikonfigurasi" };
  }
  try {
    const res = await fetch(`${PAKASIR_BASE_URL}/api/transactioncreate/qris`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: slug,
        order_id: params.orderId,
        amount: params.amount,
        api_key: apiKey,
      }),
      cache: "no-store",
    });
    if (res.ok) {
      return { completed: false };
    }
    const text = await res.text();
    if (text.includes("already completed")) {
      return { completed: true };
    }
    return { completed: false };
  } catch (e) {
    console.error("[pakasir] checkTransactionCompletedViaCreate exception:", e);
    return { completed: false, error: "Koneksi ke Pakasir gagal" };
  }
}

export async function cancelTransaction(params: {
  orderId: string;
  amount: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { slug, apiKey } = await getPakasirSettings();
  if (!slug || !apiKey) {
    return { ok: false, error: "Pakasir belum dikonfigurasi" };
  }
  try {
    const res = await fetch(`${PAKASIR_BASE_URL}/api/transactioncancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: slug,
        order_id: params.orderId,
        amount: params.amount,
        api_key: apiKey,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `Gagal membatalkan transaksi (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[pakasir] cancelTransaction exception:", e);
    return { ok: false, error: "Koneksi ke Pakasir gagal" };
  }
}

export async function simulatePayment(params: {
  orderId: string;
  amount: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { slug, apiKey } = await getPakasirSettings();
  if (!slug || !apiKey) {
    return { ok: false, error: "Pakasir belum dikonfigurasi" };
  }
  try {
    const res = await fetch(`${PAKASIR_BASE_URL}/api/paymentsimulation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: slug,
        order_id: params.orderId,
        amount: params.amount,
        api_key: apiKey,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `Simulasi gagal (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[pakasir] simulatePayment exception:", e);
    return { ok: false, error: "Koneksi ke Pakasir gagal" };
  }
}

export type PakasirPaymentUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function buildPaymentUrl(params: {
  orderId: string;
  amount: number;
  redirectUrl?: string;
  qrisOnly?: boolean;
}): Promise<PakasirPaymentUrlResult> {
  const { slug } = await getPakasirSettings();
  if (!slug) {
    return { ok: false, error: "Pakasir belum dikonfigurasi. Isi slug di pengaturan admin." };
  }
  const url = new URL(`${PAKASIR_BASE_URL}/pay/${slug}/${params.amount}`);
  url.searchParams.set("order_id", params.orderId);
  if (params.redirectUrl) {
    url.searchParams.set("redirect", params.redirectUrl);
  }
  if (params.qrisOnly) {
    url.searchParams.set("qris_only", "1");
  }
  return { ok: true, url: url.toString() };
}

export type PakasirWebhookPayload = {
  amount: number;
  order_id: string;
  project: string;
  status: string;
  payment_method: string;
  completed_at: string | null;
};

export async function verifyWebhookSignature(body: string, sigHeader: string): Promise<boolean> {
  if (!sigHeader) return false;
  const { webhookSecret } = await getPakasirSettings();
  if (!webhookSecret) return false;
  const expected = `sha256=${createHmac("sha256", webhookSecret).update(body, "utf8").digest("hex")}`;
  try {
    return cryptoTimingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader));
  } catch {
    return expected === sigHeader;
  }
}
