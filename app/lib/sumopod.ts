import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/app/lib/prisma";

const SUMOPOD_BASE_URL = "https://api-pay.sumopod.com";

const SETTING_KEYS = {
  apiKey: "sumopod_api_key",
  webhookToken: "sumopod_webhook_token",
  webhookSecret: "sumopod_webhook_secret",
} as const;

export type SumopodSettings = {
  apiKey: string;
  webhookToken: string;
  webhookSecret: string;
};

export async function getSumopodSettings(): Promise<SumopodSettings> {
  const keys = Object.values(SETTING_KEYS);
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    apiKey: map.get(SETTING_KEYS.apiKey) || "",
    webhookToken: map.get(SETTING_KEYS.webhookToken) || "",
    webhookSecret: map.get(SETTING_KEYS.webhookSecret) || "",
  };
}

export async function isSumopodConfigured(): Promise<boolean> {
  const { apiKey } = await getSumopodSettings();
  return !!apiKey;
}

export async function saveSumopodSettings(input: Partial<SumopodSettings>): Promise<void> {
  const ops: Promise<unknown>[] = [];
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
  if (input.webhookToken !== undefined) {
    const v = input.webhookToken.trim();
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.webhookToken },
        update: { value: v },
        create: { key: SETTING_KEYS.webhookToken, value: v },
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

export type SumopodPayment = {
  payment_id: string;
  order_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  payment_link_url: string;
  status: string;
  expires_at: string | null;
};

export type SumopodCreateResult =
  | { ok: true; payment: SumopodPayment }
  | { ok: false; error: string };

export async function createPayment(params: {
  orderId: string;
  amount: number;
  successReturnUrl?: string;
  cancelReturnUrl?: string;
}): Promise<SumopodCreateResult> {
  const { apiKey } = await getSumopodSettings();
  if (!apiKey) {
    return { ok: false, error: "Sumopod belum dikonfigurasi. Isi API key di pengaturan admin." };
  }
  try {
    const res = await fetch(`${SUMOPOD_BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        order_id: params.orderId,
        amount: params.amount,
        currency: "IDR",
        expires_in_hours: 24,
        payment_method_type_code: "QRIS",
        ...(params.successReturnUrl ? { success_return_url: params.successReturnUrl } : {}),
        ...(params.cancelReturnUrl ? { cancel_return_url: params.cancelReturnUrl } : {}),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[sumopod] createPayment failed:", res.status, text);
      return { ok: false, error: `Gagal membuat pembayaran Sumopod (${res.status})` };
    }

    const data = (await res.json()) as Partial<SumopodPayment> & { error?: string };
    if (!data.payment_id || !data.payment_link_url) {
      return { ok: false, error: data.error || "Response Sumopod tidak valid" };
    }
    return { ok: true, payment: data as SumopodPayment };
  } catch (e) {
    console.error("[sumopod] createPayment exception:", e);
    return { ok: false, error: "Koneksi ke Sumopod gagal" };
  }
}

export type SumopodWebhookPayload = {
  event_type: string;
  data: {
    payment_id: string;
    order_id: string;
    amount: number;
    fee?: number;
    net_amount?: number;
    status: string;
    payment_method?: string;
    completed_at?: string | null;
  };
};

/**
 * Verifikasi signature webhook ala Svix: HMAC-SHA256 base64 dari
 * `${svix-id}.${svix-timestamp}.${rawBody}` dengan secret whsec_... (base64).
 * Header svix-signature bisa berisi beberapa "v1,<sig>" dipisah spasi.
 */
export function verifySvixSignature(params: {
  secret: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  rawBody: string;
}): boolean {
  const { secret, svixId, svixTimestamp, svixSignature, rawBody } = params;
  if (!secret || !svixId || !svixTimestamp || !svixSignature) return false;
  try {
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expected = createHmac("sha256", secretBytes).update(signedContent, "utf8").digest("base64");
    const signatures = svixSignature
      .split(" ")
      .map((s) => s.split(",")[1])
      .filter(Boolean);
    return signatures.some((sig) => {
      try {
        return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      } catch {
        return sig === expected;
      }
    });
  } catch {
    return false;
  }
}

/** Alternatif sederhana: bandingkan header X-Webhook-Token dengan token proyek. */
export function verifyWebhookToken(expected: string, received: string | null): boolean {
  if (!expected || !received) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return expected === received;
  }
}

/**
 * Sumopod membebankan fee DI ATAS nominal order: customer membayar
 * amount + fee (mis. order Rp1.000 -> amount=1307, fee=307, net_amount=1000).
 * Cocokkan payload webhook terhadap order.amount secara toleran fee.
 */
export function amountMatchesOrder(
  data: { amount: number; fee?: number; net_amount?: number },
  orderAmount: number,
): boolean {
  if (data.amount === orderAmount) return true;
  if (typeof data.net_amount === "number" && data.net_amount === orderAmount) return true;
  if (typeof data.fee === "number" && data.amount - data.fee === orderAmount) return true;
  return false;
}
