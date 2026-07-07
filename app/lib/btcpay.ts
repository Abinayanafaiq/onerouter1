const BTCPAY_URL = (process.env.BTCPAY_URL || "").replace(/\/+$/, "");
const BTCPAY_STORE_ID = process.env.BTCPAY_STORE_ID || "";
const BTCPAY_API_KEY = process.env.BTCPAY_API_KEY || "";

export function isBtcpayConfigured(): boolean {
  return (
    !!BTCPAY_URL &&
    !BTCPAY_URL.includes("yourdomain.com") &&
    !!BTCPAY_STORE_ID &&
    !!BTCPAY_API_KEY
  );
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `token ${BTCPAY_API_KEY}`,
  };
}

export async function createInvoice(params: {
  orderId: string;
  amount: number;
  currency: string;
  chain: string;
}): Promise<{ invoiceId: string; checkoutLink: string } | { error: string }> {
  if (!isBtcpayConfigured()) {
    return { error: "BTCPay belum dikonfigurasi. Isi BTCPAY_URL, STORE_ID, dan API_KEY di .env" };
  }
  try {
    const { orderId, amount, currency, chain } = params;

    const res = await fetch(
      `${BTCPAY_URL}/api/v1/stores/${BTCPAY_STORE_ID}/invoices`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          amount: String(amount),
          currency,
          metadata: { orderId, chain },
          checkout: {
            defaultPaymentMethod: `${chain}-OnChain`,
          },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[btcpay] createInvoice failed:", res.status, text);
      return { error: "Gagal membuat invoice BTCPay" };
    }

    const data = (await res.json()) as { id: string; checkoutLink: string };
    return { invoiceId: data.id, checkoutLink: data.checkoutLink };
  } catch (e) {
    console.error("[btcpay] createInvoice exception:", e);
    return { error: "Koneksi ke BTCPay gagal" };
  }
}

export async function getInvoice(invoiceId: string): Promise<{
  status: string;
  settled: boolean;
} | null> {
  if (!isBtcpayConfigured()) return null;
  try {
    const res = await fetch(
      `${BTCPAY_URL}/api/v1/stores/${BTCPAY_STORE_ID}/invoices/${invoiceId}`,
      { headers: headers() },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as { status: string };

    return {
      status: data.status,
      settled: data.status === "Settled" || data.status === "Complete",
    };
  } catch {
    return null;
  }
}

export function verifyWebhookSignature(
  body: string,
  sigHeader: string,
): boolean {
  if (!sigHeader) return false;
  const secret = process.env.BTCPAY_WEBHOOK_SECRET || "";
  if (!secret) return false;

  const expected = `sha256=${computeHmacSha256(secret, body)}`;
  return timingSafeEqual(expected, sigHeader);
}

function computeHmacSha256(secret: string, body: string): string {
  // Node.js crypto based HMAC
  const crypto = require("crypto");
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  const crypto = require("crypto");
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return a === b;
  }
}

export const CRYPTO_CHAINS = [
  { id: "BTC", label: "Bitcoin (BTC)", chain: "BTC" },
  { id: "USDT-ERC20", label: "USDT (ERC20)", chain: "ETH" },
  { id: "USDT-TRC20", label: "USDT (TRC20)", chain: "TRON" },
  { id: "USDT-BEP20", label: "USDT (BEP20)", chain: "BSC" },
] as const;