"use client";

import { useState } from "react";
import Link from "next/link";

type Chain = { id: string; label: string; chain: string };

export function CheckoutForm({
  packageId,
  amount,
  chains,
  btcpayConfigured,
}: {
  packageId: string;
  amount: number;
  chains: readonly Chain[];
  btcpayConfigured: boolean;
}) {
  const [method, setMethod] = useState<"MANUAL" | "CRYPTO">("MANUAL");
  const [chain, setChain] = useState(chains[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { ok: true; checkoutLink: string } | { ok: false; error: string } | null
  >(null);

  async function handleCrypto(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

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
      setResult({ ok: true, checkoutLink: data.checkoutLink });
    } else {
      setResult({ ok: false, error: data.error || "Gagal membuat order" });
    }
    setSubmitting(false);
  }

  if (result?.ok) {
    return (
      <div className="border rounded-lg p-6 space-y-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
          ✓
        </div>
        <h2 className="text-lg font-bold">Invoice Dibuat</h2>
        <p className="text-sm text-muted-foreground">
          Klik tombol di bawah untuk membayar via BTCPay
        </p>
        <a
          href={result.checkoutLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-foreground text-background py-2.5 rounded-md font-medium hover:opacity-90"
        >
          🔗 Bayar Sekarang
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

  return (
    <form onSubmit={handleCrypto} className="space-y-4">
      {/* Payment method tabs */}
      <div className="flex border rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setMethod("MANUAL")}
          className={`flex-1 py-2 text-sm font-medium ${
            method === "MANUAL"
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
        >
          Transfer Bank
        </button>
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
            Crypto (BTC/USDT)
          </button>
        )}
      </div>

      {method === "CRYPTO" ? (
        <div className="space-y-3">
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
          {result?.ok === false && (
            <p className="text-sm text-red-600">{result.error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Membuat Invoice..." : `Buat Invoice Crypto`}
          </button>
        </div>
      ) : (
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Transfer Bank Manual</p>
          <div className="bg-muted rounded-md p-3 text-sm space-y-1">
            <p>
              <span className="font-medium">Bank:</span> BCA / Mandiri / BNI (hubungi admin)
            </p>
            <p>
              <span className="font-medium">Nominal:</span> Rp{amount.toLocaleString("id-ID")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Setelah transfer, upload bukti di halaman Dashboard.
          </p>
          <Link
            href={`/api/orders/manual/create?packageId=${packageId}`}
            className="block text-center w-full bg-foreground text-background py-2 rounded-md font-medium hover:opacity-90"
          >
            Buat Order Manual
          </Link>
        </div>
      )}
    </form>
  );
}