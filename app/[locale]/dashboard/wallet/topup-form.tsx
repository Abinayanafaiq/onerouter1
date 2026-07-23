"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { IDR_PER_TOKS, TOKS_LABEL, toksToIdr } from "@/app/lib/constants";
import { triggerWalletRefresh } from "@/app/components/credit-badge";

type PakasirResult = {
  orderId: string;
  checkoutLink: string | null;
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
const PRESETS = [10, 25, 50, 100];

/* ------------------------------------------------------------------ */
/* Inline icons (Lucide-style, no external dep)                        */
/* ------------------------------------------------------------------ */
type IconProps = { className?: string };

function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3 4.5 6v5.5c0 4.5 3.2 7.6 7.5 9 4.3-1.4 7.5-4.5 7.5-9V6L12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MessageCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8.5 9h7M8.5 12.5h4M21 12a8.5 8.5 0 0 1-11.8 7.8L4 21l1.2-5.2A8.5 8.5 0 1 1 21 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m12 3 2.7 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.8 6.5 20.3l1.1-6.2L3 9.6l6.3-.9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ZapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function CoinsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <ellipse cx="9" cy="7" rx="6" ry="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15 11.5c2.8.3 5 1.5 5 3v3c0 1.7-2.7 3-6 3s-6-1.3-6-3v-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function QrIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CryptoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 8h4.5a2.5 2.5 0 0 1 0 5H9V8Zm0 0v8m0-3h5a2.5 2.5 0 0 1 0 5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Main form                                                           */
/* ------------------------------------------------------------------ */
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
        checkoutLink?: string | null;
        totalPayment?: number;
        expiredAt?: string | null;
        orderId?: string;
      };
      if (data.success && data.orderId) {
        setPakasirResult({
          orderId: data.orderId,
          checkoutLink: data.checkoutLink ?? null,
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
    if (!wa.trim()) {
      setError("Nomor WhatsApp wajib diisi");
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

  function handleSubmit() {
    if (submitting) return;
    if (method === "BSC") handleBscCreate();
    else handlePakasirCreate();
  }

  function resetForm() {
    setPakasirResult(null);
    setBscResult(null);
    setBscConfirmations(null);
    setPaymentStatus("PENDING");
    setAmount("");
    stopPolling();
  }

  const parsedToks = parseInt(amount, 10);
  const hasValidAmount = Number.isFinite(parsedToks) && parsedToks >= MIN_TOKS;
  const previewIdr = hasValidAmount ? toksToIdr(parsedToks) : 0;
  const waValid = /^\+?\d{8,15}$/.test(wa.trim());
  const canSubmit = hasValidAmount && waValid && !submitting;
  const methodLabel = method === "BSC" ? "USDT (BEP20)" : "QRIS";
  const processingEstimate = method === "BSC" ? "~36 detik" : "Kurang dari 1 menit";

  /* ---------------- SUCCESS state ---------------- */
  if (paymentStatus === "APPROVED") {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/[0.06] p-8 text-center animate-fade-up">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-green-500/15 text-green-400 shadow-[0_0_24px_-4px_var(--accent-glow)]">
          <CheckIcon className="h-7 w-7" />
        </div>
        <h3 className="text-base font-semibold text-green-400">Top Up Berhasil!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Kredit {TOKS_LABEL} telah ditambahkan ke dompetmu.
        </p>
        <button
          onClick={resetForm}
          className="mt-5 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          Top Up Lagi
        </button>
      </div>
    );
  }

  /* ---------------- BSC invoice state ---------------- */
  if (bscResult) {
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="rounded-2xl border border-white/[0.08] bg-card p-6 space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
              <CryptoIcon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Transfer USDT (BEP20)</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Kirim tepat jumlah di bawah ke jaringan BSC.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 text-sm space-y-3">
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Kredit
              </span>
              <p className="text-base font-semibold">
                {bscResult.toks.toLocaleString("id-ID")} {TOKS_LABEL}
              </p>
            </div>
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Kirim tepat
              </span>
              <code className="text-lg font-mono font-bold break-all text-amber-400">
                {bscResult.payAmount} USDT
              </code>
            </div>
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Ke address (BEP20 / BSC)
              </span>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all rounded-lg border border-white/[0.06] bg-background p-2.5 text-xs font-mono">
                  {bscResult.walletAddress}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(bscResult.walletAddress)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-2 text-xs text-muted-foreground transition hover:text-foreground hover:border-white/20"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>
            <p className="text-xs text-amber-500/90 pt-1">
              Transfer harus PERSIS {bscResult.payAmount} USDT di jaringan BEP20 (BSC).
              Jumlah unik untuk mengidentifikasi ordermu.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {paymentStatus === "PENDING" && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                {bscConfirmations !== null
                  ? `Terdeteksi di blockchain. Menunggu konfirmasi... (${bscConfirmations})`
                  : "Menunggu pembayaran..."}
              </>
            )}
            {paymentStatus === "CANCELLED" && (
              <span className="text-red-500">Order dibatalkan.</span>
            )}
          </div>

          {paymentStatus === "CANCELLED" && (
            <button
              onClick={resetForm}
              className="block w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium transition hover:bg-white/[0.04]"
            >
              Buat Order Baru
            </button>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Verifikasi otomatis via BSC. Konfirmasi ~36 detik setelah transaksi terdeteksi.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------- QRIS invoice state ---------------- */
  if (pakasirResult) {
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="rounded-2xl border border-white/[0.08] bg-card p-6 space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent">
              <QrIcon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Invoice QRIS Dibuat</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Klik tombol di bawah untuk membayar via QRIS di halaman Pakasir.
            </p>
          </div>

          {pakasirResult.checkoutLink ? (
            <a
              href={pakasirResult.checkoutLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl bg-accent py-3 text-center text-sm font-semibold text-black transition hover:opacity-90"
            >
              Bayar Sekarang
            </a>
          ) : (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-400">
              Link pembayaran tidak tersedia, tapi status tetap dipantau otomatis.
            </p>
          )}

          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kredit</span>
              <span className="font-semibold">
                {pakasirResult.toks.toLocaleString("id-ID")} {TOKS_LABEL}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Pembayaran</span>
              <span className="font-semibold text-accent">
                Rp{pakasirResult.totalPayment.toLocaleString("id-ID")}
              </span>
            </div>
            {pakasirResult.expiredAt && (
              <p className="text-xs text-muted-foreground pt-1">
                Bayar sebelum {new Date(pakasirResult.expiredAt).toLocaleString("id-ID")}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {paymentStatus === "PENDING" && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                Menunggu pembayaran...
              </>
            )}
            {paymentStatus === "CANCELLED" && (
              <span className="text-red-500">Invoice kadaluarsa. Buat invoice baru.</span>
            )}
          </div>

          {paymentStatus === "CANCELLED" && (
            <button
              onClick={resetForm}
              className="block w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium transition hover:bg-white/[0.04]"
            >
              Buat Invoice Baru
            </button>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Pembayaran diverifikasi otomatis via API. Saldo langsung masuk setelah bayar.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------- INPUT state ---------------- */
  return (
    <div className="space-y-8">
      {/* WhatsApp Number */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircleIcon className="h-4 w-4 text-accent" />
          <label htmlFor="wa-input" className="text-sm font-semibold text-foreground">
            Nomor WhatsApp <span className="text-accent">(Wajib)</span>
          </label>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Nomor ini hanya kami gunakan jika ada masalah pembayaran, saldo tertunda,
          permintaan refund, atau kami perlu menghubungimu terkait transaksi.
        </p>
        <div className="relative">
          <input
            id="wa-input"
            type="tel"
            inputMode="tel"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            placeholder="0812xxxxxxxx"
            className={`w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent/40 ${
              wa && !waValid
                ? "border-red-500/40"
                : waValid
                  ? "border-green-500/40"
                  : "border-white/[0.08] focus:border-accent/40"
            }`}
          />
          {waValid && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
              <CheckIcon className="h-4 w-4" />
            </span>
          )}
        </div>

        {/* Green trust box */}
        <div className="rounded-xl border border-green-500/20 bg-green-500/[0.06] p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-green-400">
            <ShieldCheckIcon className="h-4 w-4 shrink-0" />
            <span>Nomor WhatsApp-mu hanya digunakan untuk dukungan transaksi.</span>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Kami akan menghubungimu hanya jika:
          </p>
          <ul className="space-y-1 pl-6 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-green-400/70" />
              Verifikasi pembayaran diperlukan
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-green-400/70" />
              Saldomu belum masuk
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-green-400/70" />
              Perlu memproses refund
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-green-400/70" />
              Ada masalah dengan transaksimu
            </li>
          </ul>
          <p className="text-xs text-muted-foreground/80 pl-6 pt-1">
            Kami tidak pernah menggunakan nomor WhatsApp-mu untuk marketing, iklan, atau spam.
          </p>
        </div>
      </section>

      {/* Credit Amount */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CoinsIcon className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Jumlah Kredit</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRESETS.map((p) => {
            const selected = parsedToks === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                  selected
                    ? "border-accent/60 bg-accent/[0.08] shadow-[0_0_0_1px_rgba(0,255,136,0.2),0_12px_36px_-16px_var(--accent-glow)]"
                    : "border-white/[0.08] bg-card hover:border-white/20 hover:bg-white/[0.03]"
                }`}
              >
                {selected && (
                  <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-black">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                )}
                <StarIcon
                  className={`h-4 w-4 mb-2 ${selected ? "text-accent" : "text-muted-foreground"}`}
                />
                <div className="text-base font-bold leading-tight">
                  {p} <span className="text-xs font-semibold text-muted-foreground">{TOKS_LABEL}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Rp{(p * IDR_PER_TOKS).toLocaleString("id-ID")}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom amount */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Atau masukkan jumlah custom</p>
          <div className="flex items-stretch rounded-xl border border-white/[0.08] bg-background focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/30 transition">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50"
              min={MIN_TOKS}
              className="flex-1 min-w-0 bg-transparent px-4 py-3 text-sm font-mono outline-none"
            />
            <span className="flex items-center px-4 text-xs font-medium text-muted-foreground shrink-0">
              {TOKS_LABEL}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            1 {TOKS_LABEL} = Rp{IDR_PER_TOKS.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Realtime calculation */}
        {hasValidAmount && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-gradient-to-r from-accent/[0.06] to-transparent px-4 py-3 animate-fade-up">
            <span className="text-lg font-bold text-accent">
              {parsedToks.toLocaleString("id-ID")} {TOKS_LABEL}
            </span>
            <span className="text-muted-foreground">=</span>
            <span className="text-lg font-bold">
              Rp{previewIdr.toLocaleString("id-ID")}
            </span>
          </div>
        )}
      </section>

      {/* Payment Method */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ZapIcon className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Metode Pembayaran</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* QRIS */}
          <button
            type="button"
            onClick={() => setMethod("PAKASIR")}
            className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
              method === "PAKASIR"
                ? "border-accent/60 bg-accent/[0.07] shadow-[0_0_0_1px_rgba(0,255,136,0.2),0_12px_36px_-16px_var(--accent-glow)]"
                : "border-white/[0.08] bg-card hover:border-white/20 hover:bg-white/[0.03]"
            }`}
          >
            {method === "PAKASIR" && (
              <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-black">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="flex items-center gap-2.5 mb-3">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${method === "PAKASIR" ? "bg-accent/15 text-accent" : "bg-white/[0.04] text-muted-foreground"}`}>
                <QrIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">QRIS</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Mendukung:</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {["GoPay", "OVO", "DANA", "ShopeePay", "Bank Transfer"].map((w) => (
                <span key={w} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10px] text-muted-foreground">
                  {w}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-green-400">
              <CheckIcon className="h-3.5 w-3.5" />
              Konfirmasi instan
            </div>
          </button>

          {/* USDT BEP20 */}
          {bscConfigured && (
            <button
              type="button"
              onClick={() => setMethod("BSC")}
              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                method === "BSC"
                  ? "border-accent/60 bg-accent/[0.07] shadow-[0_0_0_1px_rgba(0,255,136,0.2),0_12px_36px_-16px_var(--accent-glow)]"
                  : "border-white/[0.08] bg-card hover:border-white/20 hover:bg-white/[0.03]"
              }`}
            >
              {method === "BSC" && (
                <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-black">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
              )}
              <div className="flex items-center gap-2.5 mb-3">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${method === "BSC" ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.04] text-muted-foreground"}`}>
                  <CryptoIcon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">USDT (BEP20)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1.5">Mendukung:</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["Binance", "OKX", "Bybit"].map((w) => (
                  <span key={w} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10px] text-muted-foreground">
                    {w}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-green-400">
                <CheckIcon className="h-3.5 w-3.5" />
                Tanpa biaya gateway
              </div>
            </button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          {method === "BSC"
            ? "Bayar langsung dengan USDT di jaringan BEP20 (BSC). Tanpa minimum gateway, tanpa biaya. Jumlah USDT dihitung saat order dibuat (kurs real-time)."
            : "Bayar via QRIS Pakasir — kredit otomatis masuk setelah pembayaran terkonfirmasi."}
        </p>
      </section>

      {/* Payment Summary */}
      <section className="rounded-2xl border border-white/[0.08] bg-card-2 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Ringkasan Pembayaran</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Kredit</span>
            <span className="font-semibold">
              {hasValidAmount ? `${parsedToks.toLocaleString("id-ID")} ${TOKS_LABEL}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Harga</span>
            <span className="font-semibold">
              {hasValidAmount ? `Rp${previewIdr.toLocaleString("id-ID")}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Metode Pembayaran</span>
            <span className="font-semibold">{methodLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Kamu Terima</span>
            <span className="font-semibold text-accent">
              {hasValidAmount ? `${parsedToks.toLocaleString("id-ID")} ${TOKS_LABEL}` : "—"}
            </span>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimasi Proses</span>
            <span className="flex items-center gap-1.5 font-medium text-green-400">
              <ZapIcon className="h-3.5 w-3.5" />
              {processingEstimate}
            </span>
          </div>
        </div>
      </section>

      {/* Error */}
      {(error || bscError) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.08] px-4 py-3 text-sm text-red-400">
          {error || bscError}
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`group relative flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold transition-all duration-200 ${
          canSubmit
            ? "btn-accent"
            : "cursor-not-allowed border border-white/[0.08] bg-white/[0.02] text-muted-foreground"
        }`}
      >
        {submitting ? (
          <>
            <SpinnerIcon className="h-5 w-5 animate-spin" />
            Membuat Order...
          </>
        ) : (
          <>
            Buat Order
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
