import { timingSafeEqual as cryptoTimingSafeEqual } from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/app/lib/prisma";

const PAKASIR_BASE_URL = "https://app.pakasir.com";

// Metode pembayaran Pakasir API v2 (POST /api/v2/create-transaction).
export const PAKASIR_PAYMENT_METHODS = [
  "payment_link",
  "qris",
  "bri_va",
  "bni_va",
  "cimb_niaga_va",
  "permata_va",
  "maybank_va",
  "bnc_va",
  "artha_graha_va",
  "sampoerna_va",
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

/* ------------------------------------------------------------------ */
/* API v2: Create Transaction                                          */
/* POST /api/v2/create-transaction/{slug}/{order_id}                   */
/* Header: X-Api-Key. Body: { method, amount }                         */
/* Find-or-create: call berulang dengan param sama -> response sama.   */
/* ------------------------------------------------------------------ */

export type PakasirTransaction = {
  txn_id: string;
  order_id: string;
  amount: number;
  fee: number;
  total_payment: number;
  payment_method: string;
  qr_string: string;
  va_number: string;
  payment_link: string | null;
  expired_at: string | null;
  status: string;
};

export type PakasirCreateResult =
  | { ok: true; transaction: PakasirTransaction }
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
    const res = await fetch(
      `${PAKASIR_BASE_URL}/api/v2/create-transaction/${encodeURIComponent(slug)}/${encodeURIComponent(params.orderId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({ method: params.method, amount: params.amount }),
        cache: "no-store",
      },
    );

    const data = (await res.json().catch(() => null)) as
      | (Partial<PakasirTransaction> & { txn_id?: string; error?: string })
      | null;

    if (!res.ok) {
      console.error("[pakasir] createTransaction failed:", res.status, JSON.stringify(data));
      return { ok: false, error: data?.error || `Gagal membuat transaksi Pakasir (${res.status})` };
    }
    if (!data?.txn_id) {
      return { ok: false, error: data?.error || "Response Pakasir tidak valid" };
    }

    // Response method payment_link hanya berisi { txn_id, payment_link }.
    return {
      ok: true,
      transaction: {
        txn_id: data.txn_id,
        order_id: data.order_id ?? params.orderId,
        amount: data.amount ?? params.amount,
        fee: data.fee ?? 0,
        total_payment: data.total_payment ?? params.amount,
        payment_method: data.payment_method ?? params.method,
        qr_string: data.qr_string ?? "",
        va_number: data.va_number ?? "",
        payment_link: data.payment_link ?? null,
        expired_at: data.expired_at ?? null,
        status: data.status ?? "pending",
      },
    };
  } catch (e) {
    console.error("[pakasir] createTransaction exception:", e);
    return { ok: false, error: "Koneksi ke Pakasir gagal" };
  }
}

/* ------------------------------------------------------------------ */
/* API v2: Transaction Status                                          */
/* GET /api/v2/transaction-status/{slug}/{txn_id} — header X-Api-Key.  */
/* Rate limit: 4 detik sekali per transaksi.                           */
/* ------------------------------------------------------------------ */

export type PakasirTransactionStatus = {
  txn_id: string;
  order_id: string;
  amount: number;
  is_sandbox: boolean;
  status: string; // pending | completed | canceled
  completed_at: string | null;
};

export async function getTransactionStatus(params: {
  txnId: string;
}): Promise<{ ok: true; transaction: PakasirTransactionStatus } | { ok: false; error: string }> {
  const { slug, apiKey } = await getPakasirSettings();
  if (!slug || !apiKey) {
    return { ok: false, error: "Pakasir belum dikonfigurasi" };
  }
  try {
    const res = await fetch(
      `${PAKASIR_BASE_URL}/api/v2/transaction-status/${encodeURIComponent(slug)}/${encodeURIComponent(params.txnId)}`,
      { headers: { "X-Api-Key": apiKey }, cache: "no-store" },
    );
    const data = (await res.json().catch(() => null)) as
      | (Partial<PakasirTransactionStatus> & { error?: string })
      | null;
    if (!res.ok) {
      return { ok: false, error: data?.error || `Gagal cek status (${res.status})` };
    }
    if (!data?.txn_id || !data.status) {
      return { ok: false, error: data?.error || "Transaksi tidak ditemukan" };
    }
    return {
      ok: true,
      transaction: {
        txn_id: data.txn_id,
        order_id: data.order_id ?? "",
        amount: data.amount ?? 0,
        is_sandbox: data.is_sandbox ?? false,
        status: data.status,
        completed_at: data.completed_at ?? null,
      },
    };
  } catch (e) {
    console.error("[pakasir] getTransactionStatus exception:", e);
    return { ok: false, error: "Koneksi ke Pakasir gagal" };
  }
}

/* ------------------------------------------------------------------ */
/* API v2: Cancel Transaction                                          */
/* POST /api/v2/cancel-transaction/{slug}/{txn_id} — header X-Api-Key. */
/* ------------------------------------------------------------------ */

export async function cancelTransaction(params: {
  txnId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { slug, apiKey } = await getPakasirSettings();
  if (!slug || !apiKey) {
    return { ok: false, error: "Pakasir belum dikonfigurasi" };
  }
  try {
    const res = await fetch(
      `${PAKASIR_BASE_URL}/api/v2/cancel-transaction/${encodeURIComponent(slug)}/${encodeURIComponent(params.txnId)}`,
      { method: "POST", headers: { "X-Api-Key": apiKey }, cache: "no-store" },
    );
    if (!res.ok) {
      return { ok: false, error: `Gagal membatalkan transaksi (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[pakasir] cancelTransaction exception:", e);
    return { ok: false, error: "Koneksi ke Pakasir gagal" };
  }
}

/* ------------------------------------------------------------------ */
/* Webhook v2                                                          */
/* Auth: header X-Secret dibandingkan dengan webhook secret proyek.    */
/* Payload: { txn_id, order_id, amount, is_sandbox, status,            */
/*          completed_at }                                             */
/* ------------------------------------------------------------------ */

export type PakasirWebhookPayload = {
  txn_id?: string;
  order_id?: string;
  amount?: number;
  is_sandbox?: boolean;
  status?: string;
  completed_at?: string | null;
};

export async function verifyWebhookSecret(secretHeader: string): Promise<boolean> {
  if (!secretHeader) return false;
  const { webhookSecret } = await getPakasirSettings();
  if (!webhookSecret) return false;
  const a = Buffer.from(secretHeader, "utf8");
  const b = Buffer.from(webhookSecret, "utf8");
  if (a.length !== b.length) return false;
  return cryptoTimingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Helper: render qr_string menjadi data URL untuk ditampilkan di UI.  */
/* ------------------------------------------------------------------ */

export async function qrToDataUrl(qrString: string): Promise<string | null> {
  if (!qrString) return null;
  try {
    return await QRCode.toDataURL(qrString, { margin: 1, width: 280 });
  } catch (e) {
    console.error("[pakasir] qrToDataUrl failed:", e);
    return null;
  }
}
