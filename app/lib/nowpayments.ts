import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";
import { prisma } from "@/app/lib/prisma";

const SETTING_KEYS = {
  apiKey: "nowpayments_api_key",
  ipnSecret: "nowpayments_ipn_secret",
  sandbox: "nowpayments_sandbox",
} as const;

export type NowpaymentsSettings = {
  apiKey: string;
  ipnSecret: string;
  sandbox: boolean;
};

export async function getNowpaymentsSettings(): Promise<NowpaymentsSettings> {
  const keys = Object.values(SETTING_KEYS);
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    apiKey: map.get(SETTING_KEYS.apiKey) || "",
    ipnSecret: map.get(SETTING_KEYS.ipnSecret) || "",
    sandbox: map.get(SETTING_KEYS.sandbox) === "true",
  };
}

export async function isNowpaymentsConfigured(): Promise<boolean> {
  const { apiKey } = await getNowpaymentsSettings();
  return !!apiKey;
}

export async function saveNowpaymentsSettings(
  input: Partial<Omit<NowpaymentsSettings, "sandbox"> & { sandbox?: boolean }>,
): Promise<void> {
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
  if (input.ipnSecret !== undefined) {
    const v = input.ipnSecret.trim();
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.ipnSecret },
        update: { value: v },
        create: { key: SETTING_KEYS.ipnSecret, value: v },
      }),
    );
  }
  if (input.sandbox !== undefined) {
    const v = input.sandbox ? "true" : "false";
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.sandbox },
        update: { value: v },
        create: { key: SETTING_KEYS.sandbox, value: v },
      }),
    );
  }
  await Promise.all(ops);
}

function baseUrl(sandbox: boolean): string {
  return sandbox
    ? "https://api-sandbox.nowpayments.io"
    : "https://api.nowpayments.io";
}

export const NOWPAYMENTS_COINS = [
  { id: "btc", label: "Bitcoin (BTC)", payCurrency: "btc" },
  { id: "usdttrc20", label: "USDT (TRC20)", payCurrency: "usdttrc20" },
  { id: "usdterc20", label: "USDT (ERC20)", payCurrency: "usdterc20" },
  { id: "usdtbsc", label: "USDT (BEP20)", payCurrency: "usdtbsc" },
] as const;

export type NowpaymentsCoin = (typeof NOWPAYMENTS_COINS)[number];

export type NowpaymentsInvoiceResult =
  | { ok: true; invoiceId: string; invoiceUrl: string; payAmount: string; payCurrency: string }
  | { ok: false; error: string };

export async function createInvoice(params: {
  orderId: string;
  amount: number;
  payCurrency: string;
  ipnCallbackUrl: string;
}): Promise<NowpaymentsInvoiceResult> {
  const { apiKey, sandbox } = await getNowpaymentsSettings();
  if (!apiKey) {
    return { ok: false, error: "NOWPayments belum dikonfigurasi. Isi API Key di pengaturan admin." };
  }
  try {
    const res = await fetch(`${baseUrl(sandbox)}/v1/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        price_amount: params.amount,
        price_currency: "idr",
        pay_currency: params.payCurrency,
        order_id: params.orderId,
        ipn_callback_url: params.ipnCallbackUrl,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[nowpayments] createInvoice failed:", res.status, text);
      return { ok: false, error: `Gagal membuat invoice NOWPayments (${res.status})` };
    }

    const data = (await res.json()) as {
      id: number | string;
      invoice_url?: string;
      pay_amount?: string | number;
      pay_currency?: string;
    };

    if (!data.id) {
      return { ok: false, error: "Response NOWPayments tidak valid" };
    }

    return {
      ok: true,
      invoiceId: String(data.id),
      invoiceUrl: data.invoice_url || "",
      payAmount: String(data.pay_amount ?? ""),
      payCurrency: data.pay_currency || params.payCurrency,
    };
  } catch (e) {
    console.error("[nowpayments] createInvoice exception:", e);
    return { ok: false, error: "Koneksi ke NOWPayments gagal" };
  }
}

export type NowpaymentsPaymentStatus = {
  paymentStatus: string;
  finished: boolean;
};

export async function getPaymentStatus(
  paymentId: string,
): Promise<NowpaymentsPaymentStatus | null> {
  const { apiKey, sandbox } = await getNowpaymentsSettings();
  if (!apiKey) return null;
  try {
    const res = await fetch(`${baseUrl(sandbox)}/v1/payment/${paymentId}`, {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { payment_status?: string };
    const status = (data.payment_status || "").toLowerCase();
    return {
      paymentStatus: status,
      finished: status === "finished" || status === "confirmed",
    };
  } catch {
    return null;
  }
}

type IpnPayload = Record<string, unknown>;

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortObjectKeys(obj[key]);
    }
    return sorted;
  }
  return value;
}

export async function verifyWebhookSignature(
  body: string,
  sigHeader: string,
): Promise<boolean> {
  if (!sigHeader) return false;
  const { ipnSecret } = await getNowpaymentsSettings();
  if (!ipnSecret) return false;

  try {
    const parsed = JSON.parse(body) as IpnPayload;
    const sorted = sortObjectKeys(parsed);
    const msg = JSON.stringify(sorted);
    const expected = createHmac("sha512", ipnSecret).update(msg, "utf8").digest("hex");
    try {
      return cryptoTimingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader));
    } catch {
      return expected === sigHeader;
    }
  } catch {
    return false;
  }
}

export type NowpaymentsIpnPayload = {
  payment_status?: string;
  order_id?: string;
  invoice_id?: string | number;
  payment_id?: string | number;
  pay_amount?: string | number;
  pay_currency?: string;
  price_amount?: string | number;
  price_currency?: string;
  actually_paid?: string | number;
};

export function isPaymentFinished(status: string): boolean {
  const s = status.toLowerCase();
  return s === "finished" || s === "confirmed";
}
