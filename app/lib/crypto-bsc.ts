import { prisma } from "@/app/lib/prisma";

const SETTING_KEYS = {
  walletAddress: "bsc_wallet_address",
  rpcUrl: "bsc_rpc_url",
  confirmations: "bsc_confirmations",
} as const;

export type BscSettings = {
  walletAddress: string;
  rpcUrl: string;
  confirmations: number;
};

export async function getBscSettings(): Promise<BscSettings> {
  const keys = Object.values(SETTING_KEYS);
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    walletAddress: map.get(SETTING_KEYS.walletAddress) || "",
    rpcUrl: map.get(SETTING_KEYS.rpcUrl) || "https://bsc-dataseed.binance.org",
    confirmations: parseInt(map.get(SETTING_KEYS.confirmations) || "12", 10),
  };
}

export async function isBscConfigured(): Promise<boolean> {
  const { walletAddress } = await getBscSettings();
  return !!walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
}

export async function saveBscSettings(input: Partial<BscSettings>): Promise<void> {
  const ops: Promise<unknown>[] = [];
  if (input.walletAddress !== undefined) {
    const v = input.walletAddress.trim();
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.walletAddress },
        update: { value: v },
        create: { key: SETTING_KEYS.walletAddress, value: v },
      }),
    );
  }
  if (input.rpcUrl !== undefined) {
    const v = input.rpcUrl.trim();
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.rpcUrl },
        update: { value: v },
        create: { key: SETTING_KEYS.rpcUrl, value: v },
      }),
    );
  }
  if (input.confirmations !== undefined) {
    const v = String(input.confirmations);
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.confirmations },
        update: { value: v },
        create: { key: SETTING_KEYS.confirmations, value: v },
      }),
    );
  }
  await Promise.all(ops);
}

const USDT_BEP20_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
const USDT_DECIMALS = 18;
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b4ef";

let rateCache: { value: number; ts: number } | null = null;
const RATE_TTL_MS = 5 * 60 * 1000;

export async function getUsdtIdrRate(): Promise<number> {
  if (rateCache && Date.now() - rateCache.ts < RATE_TTL_MS) {
    return rateCache.value;
  }
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr",
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Coingecko ${res.status}`);
    const data = (await res.json()) as { tether?: { idr?: number } };
    const rate = data.tether?.idr;
    if (!rate || rate <= 0) throw new Error("Invalid rate");
    rateCache = { value: rate, ts: Date.now() };
    return rate;
  } catch (e) {
    console.error("[crypto-bsc] getUsdtIdrRate failed:", e);
    return rateCache?.value ?? 16000;
  }
}

export type GenerateAmountResult =
  | { ok: true; usdtAmount: string }
  | { ok: false; error: string };

export async function generateUniqueUsdtAmount(idrAmount: number): Promise<GenerateAmountResult> {
  const rate = await getUsdtIdrRate();
  if (rate <= 0) return { ok: false, error: "Gagal mendapatkan kurs USDT" };

  const baseUsdt = idrAmount / rate;
  if (baseUsdt < 0.01) {
    return { ok: false, error: `Amount terlalu kecil. Minimal Rp${Math.ceil(0.01 * rate).toLocaleString("id-ID")}` };
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(Math.random() * 1_000_000);
    const suffixValue = suffix / 1_000_000;
    const uniqueAmount = baseUsdt + suffixValue;
    const amountStr = uniqueAmount.toFixed(6);

    const collision = await prisma.order.findFirst({
      where: {
        cryptoExpectedAmount: amountStr,
        status: "PENDING",
        paymentMethod: "CRYPTO_BSC",
      },
      select: { id: true },
    });
    if (!collision) {
      return { ok: true, usdtAmount: amountStr };
    }
  }
  return { ok: false, error: "Gagal membuat amount unik, coba lagi" };
}

type RpcLog = {
  blockNumber: string;
  transactionHash: string;
  data: string;
  topics: string[];
};

type RpcResponse = {
  jsonrpc: string;
  id: number;
  result?: RpcLog[] | string;
  error?: { code: number; message: string };
};

async function rpcCall(rpcUrl: string, method: string, params: unknown[], id = 1): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const data = (await res.json()) as RpcResponse;
  if (data.error) throw new Error(`RPC error: ${data.error.message}`);
  return data.result;
}

function toHex(n: number): string {
  return "0x" + n.toString(16);
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

function formatTokenAmount(rawBigInt: bigint, decimals: number): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = rawBigInt / divisor;
  const fraction = rawBigInt % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 6);
  return `${whole.toString()}.${fractionStr}`;
}

function addressToTopic(addr: string): string {
  return "0x" + addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

export type BscPaymentCheck = {
  found: boolean;
  txHash?: string;
  confirmations?: number;
  error?: string;
};

export async function checkPaymentOnChain(orderId: string): Promise<BscPaymentCheck> {
  const { walletAddress, rpcUrl, confirmations: requiredConf } = await getBscSettings();
  if (!walletAddress) return { found: false, error: "Wallet belum dikonfigurasi" };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { found: false, error: "Order tidak ditemukan" };
  if (!order.cryptoExpectedAmount) return { found: false, error: "Expected amount tidak ada" };

  try {
    const latestBlockHex = (await rpcCall(rpcUrl, "eth_blockNumber", [])) as string;
    const latestBlock = Number(BigInt(latestBlockHex));
    const fromBlock = Math.max(0, latestBlock - 5000);

    const logs = (await rpcCall(rpcUrl, "eth_getLogs", [
      {
        address: USDT_BEP20_CONTRACT,
        topics: [TRANSFER_TOPIC, null, addressToTopic(walletAddress)],
        fromBlock: toHex(fromBlock),
        toBlock: latestBlockHex,
      },
    ])) as RpcLog[];

    if (!logs || logs.length === 0) return { found: false };

    const expectedAmount = order.cryptoExpectedAmount;

    for (const log of logs) {
      const rawAmount = hexToBigInt(log.data);
      const amountStr = formatTokenAmount(rawAmount, USDT_DECIMALS);

      if (amountStr === expectedAmount) {
        const txBlock = Number(BigInt(log.blockNumber));
        const confs = latestBlock - txBlock;
        return {
          found: true,
          txHash: log.transactionHash,
          confirmations: confs,
        };
      }
    }

    return { found: false };
  } catch (e) {
    console.error("[crypto-bsc] checkPaymentOnChain error:", e);
    return { found: false, error: (e as Error).message };
  }
}

export async function getBscScanUrl(txHash: string): Promise<string> {
  return `https://bscscan.com/tx/${txHash}`;
}
