"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { IDR_PER_TOKS, TOKS_LABEL, toksToIdr } from "@/app/lib/constants";
import { triggerWalletRefresh } from "@/app/components/credit-badge";

type PakasirResult = {
  orderId: string;
  qrImage: string;
  totalPayment: number;
  expiredAt: string | null;
  toks: number;
};

type BscResult = {
  orderId: string;
  payAmount: string;
  walletAddress: string;
  toks: number;
};

const MIN_TOKS = 1;

export function WalletTopUpForm({
  whatsapp,
  bscConfigured,
}: {
  whatsapp?: string | null;
  bscConfigured: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [wa, setWa] = useState(whatsapp || "");
  const [method, setMethod] = useState<"PAKASIR" | "BSC">(
    bscConfigured ? "BSC" : "PAKASIR",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pakasirResult, setPakasirResult] = useState<PakasirResult | null>(null);
  const [bscResult, setBscResult] = useState<BscResult | null>(null);
  const [bscError, setBscError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "APPROVED" | "CANCELLED">("PENDING");
  const [bscConfirmations, setBscConfirmations] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback(
    (orderId: string, isBsc: boolean) => {
      stopPolling();
      const endpoint = isBsc
        ? `/api/orders/bsc/status?orderId=${encodeURIComponent(orderId)}`
        : `/api/orders/pakasir/status?orderId=${encodeURIComponent(orderId)}`;
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(endpoint, { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as {
            success: boolean;
            status?: string;
            confirmations?: number;
          };
          if (!data.success || !data.status) return;
          if (isBsc && data.confirmations !== undefined) {
            setBscConfirmations(data.confirmations);
          }
          if (data.status === "APPROVED") {
            setPaymentStatus("APPROVED");
            stopPolling();
            triggerWalletRefresh();
            router.refresh();
          } else if (data.status === "CANCELLED" || data.status === "REJECTED") {
            setPaymentStatus("CANCELLED");
            stopPolling();
          }
        } catch {
          // ignore
        }
      }, 5000);
    },
    [stopPolling, router],
  );

  async function handlePakasirCreate() {
    const toks = parseInt(amount, 10);
    if (!toks || toks < MIN_TOKS) {
      setError(`Minimal top up ${MIN_TOKS} ${TOKS_LABEL}`);
      return;
    }
    if (!wa.trim()) {
      setError("Nomor WhatsApp wajib diisi");
      return;
    }
    const idrAmount = toksToIdr(toks);
    setError(null);
    setSubmitting(true);
    setPakasirResult(null);
    setPaymentStatus("PENDING");
    try {
      const res = await fetch("/api/wallet/topup-pakasir/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: idrAmount, whatsapp: wa.trim() }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        qrImage?: string;
        totalPayment?: number;
        expiredAt?: string | null;
        orderId?: string;
      };
      if (data.success && data.qrImage && data.orderId) {
        setPakasirResult({
          orderId: data.orderId,
          qrImage: data.qrImage,
          totalPayment: data.totalPayment ?? idrAmount,
          expiredAt: data.expiredAt ?? null,
          toks,
        });
        startPolling(data.orderId, false);
      } else {
        setError(data.error || "Gagal membuat invoice QRIS");
      }
    } catch {
      setError("Koneksi gagal");
    }
    setSubmitting(false);
  }

  async function handleBscCreate() {
    const toks = parseInt(amount, 10);
    if (!toks || toks < MIN_TOKS) {
      setError(`Minimal top up ${MIN_TOKS} ${TOKS_LABEL}`);
      return;
    }
    const idrAmount = toksToIdr(toks);
    setError(null);
    setBscError(null);
    setSubmitting(true);
    setBscResult(null);
    setBscConfirmations(null);
    setPaymentStatus("PENDING");
    try {
      const res = await fetch("/api/wallet/topup-bsc/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: idrAmount }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        orderId?: string;
        payAmount?: string;
        walletAddress?: string;
      };
      if (data.success && data.orderId && data.payAmount && data.walletAddress) {
        setBscResult({
          orderId: data.orderId,
          payAmount: data.payAmount,
          walletAddress: data.walletAddress,
          toks,
        });
        startPolling(data.orderId, true);
      } else {
        setBscError(data.error || "Gagal membuat order");
      }
    } catch {
      setBscError("Koneksi gagal");
    }
    setSubmitting(false);
  }

  function resetForm() {
    setPakasirResult(null);
    setBscResult(null);
    setBscConfirmations(null);
    setPaymentStatus("PENDING");
    setAmount("");
    stopPolling();
  }

  const presets = [10, 25, 50, 100];
  const parsedToks = parseInt(amount, 10);
  const previewIdr = Number.isFinite(parsedToks) && parsedToks > 0 ? toksToIdr(parsedToks) : 0;

  // SUCCESS state
  if (paymentStatus === "APPROVED") {
    return (
      <div className="border rounded-lg p-6 space-y-3 text-center bg-green-500/5 border-green-500/30">
        <div className="w-12 h-12 mx-auto rounded-full bg-green-500/15 text-green-500 flex items-center justify-center">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>
        </div>
        <h3 className="text-sm font-bold text-green-600">Top Up Berhasil!</h3>
        <p className="text-xs text-muted-foreground">Kredit {TOKS_LABEL} telah ditambahkan.</p>
        <button
          onClick={resetForm}
          className="border px-4 py-1.5 rounded-md text-xs font-medium hover:bg-muted transition"
        >
          Top Up Lagi
        </button>
      </div>
    );
  }

  // BSC invoice display
  if (bscResult) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Transfer USDT BEP20</p>
          </div>
          <div className="bg-muted rounded-md p-3 text-sm space-y-2">
            <div>
              <span className="font-medium block text-xs text-muted-foreground mb-1">Kredit:</span>
              <p className="font-bold">{bscResult.toks.toLocaleString("id-ID")} {TOKS_LABEL}</p>
            </div>
            <div>
              <span className="font-medium block text-xs text-muted-foreground mb-1">Kirim tepat:</span>
              <code className="text-lg font-mono font-bold break-all">{bscResult.payAmount} USDT</code>
            </div>
            <div>
              <span className="font-medium block text-xs text-muted-foreground mb-1">Ke address (BEP20/BSC):</span>
              <code className="text-xs font-mono break-all block bg-background p-2 rounded border">
                {bscResult.walletAddress}
              </code>
            </div>
            <p className="text-xs text-amber-600 pt-1">
              Transfer harus PERSIS {bscResult.payAmount} USDT di jaringan BEP20 (BSC). Amount unik untuk identifikasi order.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(bscResult.walletAddress)}
            className="block text-center w-full border py-2 rounded-md text-sm font-medium hover:bg-muted"
          >
            Copy Address
          </button>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {paymentStatus === "PENDING" && (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                {bscConfirmations !== null
                  ? `Terdeteksi di blockchain. Menunggu konfirmasi... (${bscConfirmations})`
                  : "Menunggu pembayaran..."}
              </>
            )}
            {paymentStatus === "CANCELLED" && (
              <span className="text-red-600">Order dibatalkan.</span>
            )}
          </div>
          {paymentStatus === "CANCELLED" && (
            <button
              onClick={resetForm}
              className="block text-center w-full border py-2 rounded-md text-sm font-medium hover:bg-muted"
            >
              Buat Order Baru
            </button>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Verifikasi otomatis via BSC. Konfirmasi ~36 detik setelah tx terdeteksi.
          </p>
        </div>
      </div>
    );
  }

  // QRIS DISPLAY state
  if (pakasirResult) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-sm font-medium mb-3">Scan QRIS untuk bayar</p>
            <img
              src={pakasirResult.qrImage}
              alt="QRIS"
              className="mx-auto max-w-[280px] w-full rounded-lg border bg-white p-2"
            />
          </div>

          <div className="bg-muted rounded-md p-3 text-sm space-y-1">
            <p>
              <span className="font-medium">Kredit:</span>{" "}
              {pakasirResult.toks.toLocaleString("id-ID")} {TOKS_LABEL}
            </p>
            <p>
              <span className="font-medium">Total Pembayaran:</span>{" "}
              Rp{pakasirResult.totalPayment.toLocaleString("id-ID")}
            </p>
            {pakasirResult.expiredAt && (
              <p className="text-xs text-muted-foreground">
                Bayar sebelum {new Date(pakasirResult.expiredAt).toLocaleString("id-ID")}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {paymentStatus === "PENDING" && (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                Menunggu pembayaran...
              </>
            )}
            {paymentStatus === "CANCELLED" && (
              <span className="text-red-600">QR kadaluarsa. Buat invoice baru.</span>
            )}
          </div>

          {paymentStatus === "CANCELLED" && (
            <button
              onClick={resetForm}
              className="block text-center w-full border py-2 rounded-md text-sm font-medium hover:bg-muted"
            >
              Buat Invoice Baru
            </button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Pembayaran diverifikasi otomatis. Saldo langsung masuk setelah bayar.
          </p>
        </div>
      </div>
    );
  }

  // INPUT state
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium block mb-1.5">Nomor WhatsApp</label>
        <input
          type="tel"
          value={wa}
          onChange={(e) => setWa(e.target.value)}
          placeholder="08xxxxxxxxxx"
          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium block mb-1.5">
          Jumlah Kredit ({TOKS_LABEL})
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center border rounded-md bg-background focus-within:ring-1 focus-within:ring-foreground/30">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50"
              min={MIN_TOKS}
              className="flex-1 min-w-0 px-3 py-2 bg-transparent text-sm font-mono outline-none"
            />
            <span className="px-3 text-xs font-medium text-muted-foreground shrink-0">
              {TOKS_LABEL}
            </span>
          </div>
          <button
            type="button"
            onClick={method === "BSC" ? handleBscCreate : handlePakasirCreate}
            disabled={submitting}
            className="bg-foreground text-background px-4 py-2 rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "..." : method === "BSC" ? "Buat Order" : "Bayar via QRIS"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className="text-xs border px-2 py-1 rounded hover:bg-muted transition"
            >
              {p} {TOKS_LABEL}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          1 {TOKS_LABEL} = Rp{IDR_PER_TOKS.toLocaleString("id-ID")}
          {previewIdr > 0 && (
            <>
              {" "}· Bayar Rp{previewIdr.toLocaleString("id-ID")} untuk{" "}
              {parsedToks.toLocaleString("id-ID")} {TOKS_LABEL}
            </>
          )}
        </p>
      </div>

      <div className="flex border rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setMethod("PAKASIR")}
          className={`flex-1 py-2 text-xs font-medium ${
            method === "PAKASIR"
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
        >
          QRIS
        </button>
        {bscConfigured && (
          <button
            type="button"
            onClick={() => setMethod("BSC")}
            className={`flex-1 py-2 text-xs font-medium ${
              method === "BSC"
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            USDT BEP20
          </button>
        )}
      </div>

      {method === "BSC" && bscConfigured && (
        <p className="text-[10px] text-muted-foreground">
          Bayar langsung dengan USDT di jaringan BEP20 (BSC). No minimum, no gateway fee. Amount USDT dihitung saat order dibuat (kurs real-time).
        </p>
      )}

      {method === "PAKASIR" && (
        <p className="text-[10px] text-muted-foreground">
          Bayar via QRIS Pakasir — kredit otomatis masuk setelah pembayaran terkonfirmasi.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {bscError && <p className="text-xs text-red-600">{bscError}</p>}
    </div>
  );
}
