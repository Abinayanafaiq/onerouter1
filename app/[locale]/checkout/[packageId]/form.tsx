"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { triggerWalletRefresh } from "@/app/components/credit-badge";

type Chain = { id: string; label: string; chain: string };

type PakasirResult = {
  qrImage: string;
  totalPayment: number;
  expiredAt: string | null;
  orderId: string;
};

type BscResult = {
  orderId: string;
  payAmount: string;
  walletAddress: string;
};

export function CheckoutForm({
  packageId,
  amount,
  chains,
  btcpayConfigured,
  pakasirConfigured,
  bscConfigured,
}: {
  packageId: string;
  amount: number;
  chains: readonly Chain[];
  btcpayConfigured: boolean;
  pakasirConfigured: boolean;
  bscConfigured: boolean;
}) {
  const router = useRouter();
  const defaultTab: "PAKASIR" | "CRYPTO" | "BSC" = pakasirConfigured
    ? "PAKASIR"
    : bscConfigured
      ? "BSC"
      : "CRYPTO";
  const [method, setMethod] = useState<"PAKASIR" | "CRYPTO" | "BSC">(defaultTab);
  const [chain, setChain] = useState(chains[0]?.id ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cryptoResult, setCryptoResult] = useState<
    { ok: true; checkoutLink: string; provider: string } | { ok: false; error: string } | null
  >(null);
  const [bscResult, setBscResult] = useState<BscResult | null>(null);
  const [bscError, setBscError] = useState<string | null>(null);
  const [bscStatus, setBscStatus] = useState<"PENDING" | "APPROVED" | "CANCELLED">("PENDING");
  const [bscConfirmations, setBscConfirmations] = useState<number | null>(null);
  const [pakasirResult, setPakasirResult] = useState<PakasirResult | null>(null);
  const [pakasirError, setPakasirError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "APPROVED" | "CANCELLED">("PENDING");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

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
            if (isBsc) {
              setBscStatus("APPROVED");
            } else {
              setPaymentStatus("APPROVED");
            }
            stopPolling();
            triggerWalletRefresh();
          } else if (data.status === "CANCELLED" || data.status === "REJECTED") {
            if (isBsc) {
              setBscStatus("CANCELLED");
            } else {
              setPaymentStatus("CANCELLED");
            }
            stopPolling();
          }
        } catch {
          // ignore transient errors
        }
      }, 5000);
    },
    [stopPolling],
  );

  async function handleCrypto(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCryptoResult(null);

    const res = await fetch("/api/orders/btcpay/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, chain }),
    });

    const data = (await res.json()) as {
      success: boolean;
      error?: string;
      checkoutLink?: string;
    };

    if (data.success && data.checkoutLink) {
      setCryptoResult({ ok: true, checkoutLink: data.checkoutLink, provider: "BTCPay" });
    } else {
      setCryptoResult({ ok: false, error: data.error || "Gagal membuat order" });
    }
    setSubmitting(false);
  }

  async function handleBscCreate() {
    setSubmitting(true);
    setBscError(null);
    setBscResult(null);
    setBscStatus("PENDING");
    setBscConfirmations(null);
    try {
      const res = await fetch("/api/orders/bsc/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
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

  async function handlePakasirCreate() {
    if (!whatsapp.trim()) {
      setPakasirError("Nomor WhatsApp wajib diisi");
      return;
    }
    setPakasirError(null);
    setSubmitting(true);
    setPakasirResult(null);
    setPaymentStatus("PENDING");
    try {
      const res = await fetch("/api/orders/pakasir/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, whatsapp: whatsapp.trim() }),
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
          qrImage: data.qrImage,
          totalPayment: data.totalPayment ?? amount,
          expiredAt: data.expiredAt ?? null,
          orderId: data.orderId,
        });
        startPolling(data.orderId, false);
      } else {
        setPakasirError(data.error || "Gagal membuat invoice QRIS");
      }
    } catch {
      setPakasirError("Koneksi gagal");
    }
    setSubmitting(false);
  }

  if (paymentStatus === "APPROVED" || bscStatus === "APPROVED") {
    return (
      <div className="border rounded-lg p-6 space-y-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-green-500/15 text-green-500 flex items-center justify-center">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>
        </div>
        <h2 className="text-lg font-bold">Pembayaran Berhasil</h2>
        <p className="text-sm text-muted-foreground">
          API key telah dibuat dan siap dipakai.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="block w-full bg-foreground text-background py-2.5 rounded-md font-medium hover:opacity-90"
        >
          Lihat API Key di Dashboard
        </button>
      </div>
    );
  }

  if (cryptoResult?.ok) {
    return (
      <div className="border rounded-lg p-6 space-y-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-full border border-foreground/20 text-foreground flex items-center justify-center">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>
        </div>
        <h2 className="text-lg font-bold">Invoice Dibuat</h2>
        <p className="text-sm text-muted-foreground">
          Klik tombol di bawah untuk membayar via {cryptoResult.provider}
        </p>
        <a
          href={cryptoResult.checkoutLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-foreground text-background py-2.5 rounded-md font-medium hover:opacity-90"
        >
          Bayar Sekarang
        </a>
        <p className="text-xs text-muted-foreground">
          Setelah pembayaran terkonfirmasi, API key akan muncul di Dashboard.
        </p>
        <Link href="/dashboard" className="block text-sm hover:underline">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const showPakasirTab = pakasirConfigured;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1.5">
          Nomor WhatsApp
        </label>
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="08xxxxxxxxxx"
          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Admin akan menghubungi via WhatsApp bila ada masalah
        </p>
      </div>

      <div className="flex border rounded-md overflow-hidden">
        {showPakasirTab && (
          <button
            type="button"
            onClick={() => setMethod("PAKASIR")}
            className={`flex-1 py-2 text-sm font-medium ${
              method === "PAKASIR"
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            QRIS
          </button>
        )}
        {bscConfigured && (
          <button
            type="button"
            onClick={() => setMethod("BSC")}
            className={`flex-1 py-2 text-sm font-medium ${
              method === "BSC"
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            USDT BEP20
          </button>
        )}
        {btcpayConfigured && (
          <button
            type="button"
            onClick={() => setMethod("CRYPTO")}
            className={`flex-1 py-2 text-sm font-medium ${
              method === "CRYPTO"
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            Crypto (BTCPay)
          </button>
        )}
      </div>

      {!showPakasirTab && !btcpayConfigured && !bscConfigured && (
        <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
          Pembayaran belum dikonfigurasi. Hubungi admin.
        </div>
      )}

      {method === "CRYPTO" && btcpayConfigured && (
        <form onSubmit={handleCrypto} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Bayar dengan crypto via BTCPay. Kurs otomatis dihitung saat pembayaran.
          </p>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Pilih Network
            </label>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            >
              {chains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {cryptoResult?.ok === false && (
            <p className="text-sm text-red-600">{cryptoResult.error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Membuat Invoice..." : "Buat Invoice Crypto"}
          </button>
        </form>
      )}

      {method === "BSC" && bscConfigured && (
        <div className="space-y-3">
          {bscResult ? (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Transfer USDT BEP20</p>
              </div>
              <div className="bg-muted rounded-md p-3 text-sm space-y-2">
                <div>
                  <span className="font-medium block text-xs text-muted-foreground mb-1">Kirim tepat:</span>
                  <code className="text-lg font-mono font-bold break-all">{bscResult.payAmount} USDT</code>
                </div>
                <div>
                  <span className="font-medium block text-xs text-muted-foreground mb-1">Ke address:</span>
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
                onClick={() => {
                  navigator.clipboard?.writeText(bscResult.walletAddress);
                }}
                className="block text-center w-full border py-2 rounded-md text-sm font-medium hover:bg-muted"
              >
                Copy Address
              </button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {bscStatus === "PENDING" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    {bscConfirmations !== null
                      ? `Terdeteksi di blockchain. Menunggu konfirmasi... (${bscConfirmations})`
                      : "Menunggu pembayaran..."}
                  </>
                )}
                {bscStatus === "CANCELLED" && (
                  <span className="text-red-600">Order dibatalkan.</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Verifikasi otomatis via BSC. Konfirmasi ~36 detik setelah tx terdeteksi.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Bayar langsung dengan USDT di jaringan BEP20 (BSC). No minimum, no gateway fee.
              </p>
              <div className="bg-muted rounded-md p-3 text-sm">
                <p>
                  <span className="font-medium">Nominal:</span> Rp{amount.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Amount USDT dihitung saat order dibuat (kurs real-time).
                </p>
              </div>
              {bscError && (
                <p className="text-sm text-red-600">{bscError}</p>
              )}
              <button
                type="button"
                onClick={handleBscCreate}
                disabled={submitting}
                className="block text-center w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Membuat Order..." : "Buat Order USDT"}
              </button>
            </>
          )}
        </div>
      )}

      {method === "PAKASIR" && showPakasirTab && (
        <div className="border rounded-lg p-4 space-y-4">
          {pakasirResult ? (
            <>
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
                  <span className="font-medium">Total Pembayaran:</span>{" "}
                  Rp{pakasirResult.totalPayment.toLocaleString("id-ID")}
                </p>
                {pakasirResult.expiredAt && (
                  <p className="text-xs text-muted-foreground">
                    Berlaku s/d {new Date(pakasirResult.expiredAt).toLocaleString("id-ID")}
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
                  <span className="text-red-600">
                    Pembayaran kadaluarsa/dibatalkan. Buat invoice baru.
                  </span>
                )}
              </div>

              {paymentStatus === "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => {
                    setPakasirResult(null);
                    setPaymentStatus("PENDING");
                  }}
                  className="block text-center w-full border py-2 rounded-md text-sm font-medium hover:bg-muted"
                >
                  Buat Invoice Baru
                </button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Pembayaran diverifikasi otomatis. Tidak perlu upload bukti.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Bayar via QRIS. Setelah pembayaran terkonfirmasi, API key otomatis dibuat.
              </p>
              <div className="bg-muted rounded-md p-3 text-sm">
                <p>
                  <span className="font-medium">Nominal:</span> Rp{amount.toLocaleString("id-ID")}
                </p>
              </div>
              {pakasirError && (
                <p className="text-sm text-red-600">{pakasirError}</p>
              )}
              <button
                type="button"
                onClick={handlePakasirCreate}
                disabled={submitting}
                className="block text-center w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Membuat Invoice..." : "Buat Invoice QRIS"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
