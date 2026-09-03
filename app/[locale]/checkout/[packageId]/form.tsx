"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { triggerWalletRefresh } from "@/app/components/credit-badge";

type Chain = { id: string; label: string; chain: string };

type PakasirResult = {
  checkoutLink: string | null;
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
  renewApiKeyId,
}: {
  packageId: string;
  amount: number;
  chains: readonly Chain[];
  btcpayConfigured: boolean;
  pakasirConfigured: boolean;
  bscConfigured: boolean;
  renewApiKeyId?: string | null;
}) {
  const router = useRouter();
  // Renew hanya didukung via QRIS (endpoint crypto belum meneruskan
  // renewApiKeyId) — sembunyikan tab crypto supaya tidak terbit key baru
  // tanpa disadari user yang berniat memperpanjang key lama.
  const cryptoEnabled = btcpayConfigured && !renewApiKeyId;
  const bscEnabled = bscConfigured && !renewApiKeyId;
  const defaultTab: "PAKASIR" | "CRYPTO" | "BSC" = pakasirConfigured
    ? "PAKASIR"
    : bscEnabled
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
  const rootRef = useRef<HTMLDivElement>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const view: "approved" | "crypto" | "bsc" | "pakasir" | "input" =
    paymentStatus === "APPROVED" || bscStatus === "APPROVED"
      ? "approved"
      : cryptoResult?.ok
        ? "crypto"
        : bscResult
          ? "bsc"
          : pakasirResult
            ? "pakasir"
            : "input";

  useEffect(() => {
    if (view === "input") return;
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view]);

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
        body: JSON.stringify({
          packageId,
          whatsapp: whatsapp.trim(),
          ...(renewApiKeyId ? { renewApiKeyId } : {}),
        }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        checkoutLink?: string | null;
        totalPayment?: number;
        expiredAt?: string | null;
        orderId?: string;
      };
      if (data.success && data.orderId) {
        setPakasirResult({
          checkoutLink: data.checkoutLink ?? null,
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
      <div ref={rootRef} className="glass relative scroll-mt-20 overflow-hidden rounded-2xl p-8 text-center">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(184,255,69,0.12), transparent 70%)" }}
          aria-hidden
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-accent">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>
        </div>
        <h2 className="gradient-text mt-4 text-xl font-bold tracking-tight">Pembayaran Berhasil</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {renewApiKeyId
            ? "Paket berhasil diperpanjang — kuota kembali penuh & masa aktif diperpanjang pada API key Anda yang sama."
            : "API key telah dibuat dan siap dipakai."}
        </p>
        <button
          onClick={() => router.push(renewApiKeyId ? "/dashboard/packages" : "/dashboard")}
          className="btn-accent mt-6 block w-full rounded-xl py-3 text-sm font-medium"
        >
          {renewApiKeyId ? "Lihat Paket Saya" : "Lihat API Key di Dashboard"}
        </button>
      </div>
    );
  }

  if (cryptoResult?.ok) {
    return (
      <div ref={rootRef} className="glass scroll-mt-20 rounded-2xl p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-foreground">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>
        </div>
        <h2 className="text-lg font-bold tracking-tight">Invoice Dibuat</h2>
        <p className="text-sm text-muted-foreground">
          Klik tombol di bawah untuk membayar via {cryptoResult.provider}
        </p>
        <a
          href={cryptoResult.checkoutLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent block w-full rounded-xl py-3 text-sm font-medium"
        >
          Bayar Sekarang
        </a>
        <p className="text-xs text-muted-foreground">
          Setelah pembayaran terkonfirmasi, API key akan muncul di Dashboard.
        </p>
        <Link href="/dashboard" className="inline-block text-sm text-muted-foreground transition hover:text-foreground hover:underline">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const showPakasirTab = pakasirConfigured;

  return (
    <div ref={rootRef} className="scroll-mt-20 space-y-5">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
          Nomor WhatsApp
        </label>
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="08xxxxxxxxxx"
          className="w-full px-4 py-2.5 border border-white/[0.09] rounded-xl bg-white/[0.02] text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-accent/40 focus:bg-white/[0.04]"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Admin akan menghubungi via WhatsApp bila ada masalah
        </p>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
          Metode Pembayaran
        </label>
        <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
          {showPakasirTab && (
            <button
              type="button"
              onClick={() => setMethod("PAKASIR")}
              className={`rounded-lg py-2.5 text-sm font-medium transition ${
                method === "PAKASIR"
                  ? "bg-foreground text-background shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              QRIS
            </button>
          )}
          {bscEnabled && (
            <button
              type="button"
              onClick={() => setMethod("BSC")}
              className={`rounded-lg py-2.5 text-sm font-medium transition ${
                method === "BSC"
                  ? "bg-foreground text-background shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              USDT BEP20
            </button>
          )}
          {cryptoEnabled && (
            <button
              type="button"
              onClick={() => setMethod("CRYPTO")}
              className={`rounded-lg py-2.5 text-sm font-medium transition ${
                method === "CRYPTO"
                  ? "bg-foreground text-background shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              Crypto (BTCPay)
            </button>
          )}
        </div>
      </div>

      {!showPakasirTab && !cryptoEnabled && !bscEnabled && (
        <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
          Pembayaran belum dikonfigurasi. Hubungi admin.
        </div>
      )}

      {method === "CRYPTO" && cryptoEnabled && (
        <form onSubmit={handleCrypto} className="glass rounded-2xl p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Bayar dengan crypto via BTCPay. Kurs otomatis dihitung saat pembayaran.
          </p>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Pilih Network
            </label>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="w-full px-4 py-2.5 border border-white/[0.09] rounded-xl bg-white/[0.02] text-sm text-foreground outline-none transition focus:border-accent/40 focus:bg-white/[0.04]"
            >
              {chains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {cryptoResult?.ok === false && (
            <p className="text-sm text-red-400">{cryptoResult.error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-accent w-full rounded-xl py-3 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Membuat Invoice..." : "Buat Invoice Crypto"}
          </button>
        </form>
      )}

      {method === "BSC" && bscEnabled && (
        <div className="space-y-3">
          {bscResult ? (
            <div className="glass rounded-2xl p-5 space-y-3">
              <div className="text-center">
                <p className="text-sm font-semibold">Transfer USDT BEP20</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-sm space-y-2">
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">Kirim tepat:</span>
                  <code className="text-lg font-mono font-bold break-all text-accent">{bscResult.payAmount} USDT</code>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">Ke address:</span>
                  <code className="text-xs font-mono break-all block bg-black/30 p-2.5 rounded-lg border border-white/[0.08]">
                    {bscResult.walletAddress}
                  </code>
                </div>
                <p className="text-xs text-amber-400 pt-1">
                  Transfer harus PERSIS {bscResult.payAmount} USDT di jaringan BEP20 (BSC). Amount unik untuk identifikasi order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(bscResult.walletAddress);
                }}
                className="block w-full rounded-xl border border-white/[0.1] bg-white/[0.03] py-2.5 text-sm font-medium transition hover:bg-white/[0.06]"
              >
                Copy Address
              </button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {bscStatus === "PENDING" && (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                    </span>
                    {bscConfirmations !== null
                      ? `Terdeteksi di blockchain. Menunggu konfirmasi... (${bscConfirmations})`
                      : "Menunggu pembayaran..."}
                  </>
                )}
                {bscStatus === "CANCELLED" && (
                  <span className="text-red-400">Order dibatalkan.</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Verifikasi otomatis via BSC. Konfirmasi ~36 detik setelah tx terdeteksi.
              </p>
            </div>
          ) : (
            <div className="glass rounded-2xl p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Bayar langsung dengan USDT di jaringan BEP20 (BSC). No minimum, no gateway fee.
              </p>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-sm">
                <p>
                  <span className="text-muted-foreground">Nominal:</span>{" "}
                  <span className="font-bold">Rp{amount.toLocaleString("id-ID")}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Amount USDT dihitung saat order dibuat (kurs real-time).
                </p>
              </div>
              {bscError && (
                <p className="text-sm text-red-400">{bscError}</p>
              )}
              <button
                type="button"
                onClick={handleBscCreate}
                disabled={submitting}
                className="btn-accent block w-full rounded-xl py-3 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "Membuat Order..." : "Buat Order USDT"}
              </button>
            </div>
          )}
        </div>
      )}

      {method === "PAKASIR" && showPakasirTab && (
        <div className="glass rounded-2xl p-5 space-y-4">
          {pakasirResult ? (
            <>
              <div className="text-center">
                <p className="text-sm font-semibold">Invoice QRIS Dibuat</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Klik tombol di bawah untuk membayar via QRIS di halaman pembayaran Pakasir.
                </p>
              </div>

              {pakasirResult.checkoutLink ? (
                <a
                  href={pakasirResult.checkoutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-accent block w-full rounded-xl py-3 text-sm font-medium text-center"
                >
                  Bayar Sekarang
                </a>
              ) : (
                <p className="text-sm text-amber-400 text-center">
                  Link pembayaran tidak tersedia, tapi status tetap dipantau otomatis.
                </p>
              )}

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Total Pembayaran:</span>{" "}
                  <span className="font-bold">Rp{pakasirResult.totalPayment.toLocaleString("id-ID")}</span>
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
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                    </span>
                    Menunggu pembayaran...
                  </>
                )}
                {paymentStatus === "CANCELLED" && (
                  <span className="text-red-400">
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
                  className="block w-full rounded-xl border border-white/[0.1] bg-white/[0.03] py-2.5 text-sm font-medium transition hover:bg-white/[0.06]"
                >
                  Buat Invoice Baru
                </button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Pembayaran diverifikasi otomatis via API. Tidak perlu upload bukti.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {renewApiKeyId
                  ? "Bayar via QRIS. Setelah pembayaran terkonfirmasi, kuota diisi ulang penuh & masa aktif diperpanjang pada API key Anda yang sekarang. Sisa kuota lama hangus."
                  : "Bayar via QRIS. Setelah pembayaran terkonfirmasi, API key otomatis dibuat."}
              </p>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-sm">
                <p>
                  <span className="text-muted-foreground">Nominal:</span>{" "}
                  <span className="font-bold">Rp{amount.toLocaleString("id-ID")}</span>
                </p>
              </div>
              {pakasirError && (
                <p className="text-sm text-red-400">{pakasirError}</p>
              )}
              <button
                type="button"
                onClick={handlePakasirCreate}
                disabled={submitting}
                className="btn-accent block w-full rounded-xl py-3 text-sm font-medium disabled:opacity-50"
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
