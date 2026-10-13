"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { PackageBrandIcon } from "@/app/components/package-brand-icon";

export type LandingPackage = {
  id: string;
  name: string;
  price: number;
  toksPrice: number | null;
  /** Kuota token dalam angka biasa (sudah dikonversi dari BigInt di server). */
  tokenQuota: number;
  durationDays: number;
  stock: number;
  isPromo: boolean;
  highlight: boolean;
  isSpecial: boolean;
  group: string;
  features: string[];
};

export type LandingPackageGroup = { key: string; title: string };

function formatQuota(quota: number, isEn: boolean): { value: string; unit: string } {
  if (quota >= 1_000_000) {
    return {
      value: (quota / 1_000_000).toLocaleString(isEn ? "en-US" : "id-ID", { maximumFractionDigits: 1 }),
      unit: isEn ? "million tokens" : "juta token",
    };
  }
  return { value: quota.toLocaleString(isEn ? "en-US" : "id-ID"), unit: isEn ? "tokens" : "token" };
}

function formatDuration(days: number, isEn: boolean): string {
  if (isEn) return days === 1 ? "Active 24 hours" : `Active ${days} days`;
  return days === 1 ? "Aktif 24 jam" : `Aktif ${days} hari`;
}

export function PackagePricing({
  packages,
  groups,
  isEn,
}: {
  packages: LandingPackage[];
  groups: LandingPackageGroup[];
  isEn: boolean;
}) {
  const [selected, setSelected] = useState<string>("all");
  const visible = selected === "all" ? packages : packages.filter((p) => p.group === selected);
  const nf = (n: number) => n.toLocaleString(isEn ? "en-US" : "id-ID");

  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-12 text-center text-sm text-muted-foreground">
        {isEn ? "Packages are being updated. Please check back soon." : "Paket sedang diperbarui. Silakan cek kembali sebentar lagi."}
      </div>
    );
  }

  return (
    <div>
      {/* Filter model — bisa di-scroll horizontal di HP */}
      {groups.length > 1 && (
        <div className="-mx-4 mb-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap sm:justify-center" role="tablist" aria-label={isEn ? "Filter packages" : "Filter paket"}>
            {[{ key: "all", title: isEn ? "All packages" : "Semua paket" }, ...groups].map((g) => {
              const active = selected === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelected(g.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active
                      ? "border-accent/60 bg-accent/15 text-accent"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-foreground"
                  }`}
                >
                  {g.key !== "all" && <PackageBrandIcon group={g.key} className="h-4 w-4" />}
                  {g.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {visible.map((pkg) => {
          const soldOut = pkg.stock <= 0;
          const lowStock = !soldOut && pkg.stock <= 5;
          const quota = formatQuota(pkg.tokenQuota, isEn);
          const perMillion = pkg.tokenQuota > 0 ? Math.round(pkg.price / (pkg.tokenQuota / 1_000_000)) : null;
          const extraFeatures = pkg.features.slice(2, 5);

          return (
            <article
              key={pkg.id}
              className={`relative flex flex-col rounded-2xl border p-4 sm:p-5 ${
                pkg.highlight
                  ? "border-accent/50 bg-accent/[0.05] shadow-[0_0_0_1px_rgba(184,255,69,0.15)]"
                  : pkg.isPromo
                    ? "border-rose-400/30 bg-rose-400/[0.04]"
                    : "border-white/[0.09] bg-white/[0.025]"
              }`}
            >
              {/* Baris atas: nama + badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <PackageBrandIcon group={pkg.group} className="h-5 w-5" />
                  </span>
                  <h3 className="min-w-0 break-words text-[15px] font-semibold leading-snug text-foreground">
                    {pkg.name}
                  </h3>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {pkg.highlight && (
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                      {isEn ? "Best value" : "Terlaris"}
                    </span>
                  )}
                  {pkg.isPromo && (
                    <span className="rounded-full border border-rose-400/40 bg-rose-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-200">
                      Promo
                    </span>
                  )}
                  {!pkg.highlight && !pkg.isPromo && pkg.isSpecial && (
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200">
                      {isEn ? "Specific model" : "Model khusus"}
                    </span>
                  )}
                </div>
              </div>

              {/* Kuota vs harga — informasi utama */}
              <div className="mt-4 flex items-end justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {isEn ? "You get" : "Dapat"}
                  </div>
                  <div className="mt-0.5 leading-none">
                    <span className="text-2xl font-bold tracking-tight text-accent">{quota.value}</span>{" "}
                    <span className="text-[12px] font-medium text-accent/80">{quota.unit}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {isEn ? "Price" : "Harga"}
                  </div>
                  <div className="mt-0.5 text-xl font-bold leading-none tracking-tight text-foreground">
                    Rp{nf(pkg.price)}
                  </div>
                </div>
              </div>

              {/* Info ringkas */}
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                <span>{formatDuration(pkg.durationDays, isEn)}</span>
                {perMillion != null && (
                  <>
                    <span aria-hidden className="text-white/20">•</span>
                    <span>
                      ≈ Rp{nf(perMillion)} / {isEn ? "1M tokens" : "1 juta token"}
                    </span>
                  </>
                )}
                {pkg.toksPrice != null && pkg.toksPrice > 0 && (
                  <>
                    <span aria-hidden className="text-white/20">•</span>
                    <span className="text-accent/90">
                      {isEn ? "or" : "atau"} {nf(pkg.toksPrice)} TOKS
                    </span>
                  </>
                )}
              </div>

              {extraFeatures.length > 0 && (
                <ul className="mt-3 flex-1 space-y-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {extraFeatures.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden className="text-accent">✓</span>
                      <span className="min-w-0 break-words">{f}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <span
                  className={`text-[11px] font-medium ${
                    soldOut ? "text-red-400" : lowStock ? "text-amber-300" : "text-muted-foreground"
                  }`}
                >
                  {soldOut
                    ? isEn ? "Sold out" : "Stok habis"
                    : lowStock
                      ? isEn ? `Only ${nf(pkg.stock)} left!` : `Sisa ${nf(pkg.stock)} lagi!`
                      : isEn ? `Stock: ${nf(pkg.stock)}` : `Stok: ${nf(pkg.stock)}`}
                </span>
              </div>

              {soldOut ? (
                <span className="mt-2 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm font-semibold text-muted-foreground">
                  {isEn ? "Sold out" : "Stok habis"}
                </span>
              ) : (
                <Link
                  href={`/checkout/${pkg.id}`}
                  className={`mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    pkg.highlight
                      ? "btn-accent"
                      : "border border-white/15 bg-white/[0.05] text-foreground hover:border-accent/40 hover:bg-accent/[0.08]"
                  }`}
                >
                  {isEn ? "Buy package" : "Beli paket"}
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
