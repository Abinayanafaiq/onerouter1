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

/** Grup yang punya logo brand; grup lain (general/other) tampil tanpa ikon. */
const BRANDED_GROUPS = new Set(["glm", "kimi", "deepseek", "gemini", "qwen", "minimax", "claude"]);

function formatQuota(quota: number, isEn: boolean): string {
  if (quota >= 1_000_000) {
    const value = (quota / 1_000_000).toLocaleString(isEn ? "en-US" : "id-ID", { maximumFractionDigits: 1 });
    return `${value} ${isEn ? "million tokens" : "juta token"}`;
  }
  return `${quota.toLocaleString(isEn ? "en-US" : "id-ID")} ${isEn ? "tokens" : "token"}`;
}

function formatDuration(days: number, isEn: boolean): string {
  if (isEn) return days === 1 ? "24 hours" : `${days} days`;
  return days === 1 ? "24 jam" : `${days} hari`;
}

/** Logo brand satu warna: putih di kartu gelap, hitam di permukaan terang. */
function MonoBrandIcon({ group, onLight }: { group: string; onLight: boolean }) {
  if (!BRANDED_GROUPS.has(group)) return null;
  return (
    <PackageBrandIcon
      group={group}
      className={`h-3.5 w-3.5 shrink-0 brightness-0 ${onLight ? "" : "invert"}`}
    />
  );
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
  const [showSoldOut, setShowSoldOut] = useState(false);
  const visible = selected === "all" ? packages : packages.filter((p) => p.group === selected);
  // Paket yang stoknya habis dilipat dulu supaya daftar tidak dipenuhi kartu "Stok habis".
  const available = visible.filter((p) => p.stock > 0);
  const soldOutCount = visible.length - available.length;
  const canCollapse = available.length > 0 && soldOutCount > 0;
  const shown = canCollapse && !showSoldOut ? available : visible;
  const nf = (n: number) => n.toLocaleString(isEn ? "en-US" : "id-ID");

  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border px-5 py-14 text-center text-sm text-muted-foreground">
        {isEn ? "Packages are being updated. Please check back soon." : "Paket sedang diperbarui. Silakan cek kembali sebentar lagi."}
      </div>
    );
  }

  return (
    <div>
      {/* Filter model — bisa di-scroll horizontal di HP */}
      {groups.length > 1 && (
        <div className="-mx-4 mb-8 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mb-10 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  className="lp-chip inline-flex shrink-0 items-center gap-2 px-4 py-2 text-[13px] font-medium"
                >
                  <MonoBrandIcon group={g.key} onLight={active} />
                  {g.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {shown.map((pkg) => {
          const soldOut = pkg.stock <= 0;
          const lowStock = !soldOut && pkg.stock <= 5;
          const perMillion = pkg.tokenQuota > 0 ? Math.round(pkg.price / (pkg.tokenQuota / 1_000_000)) : null;
          const extraFeatures = pkg.features.slice(2, 5);
          const groupTitle = groups.find((g) => g.key === pkg.group)?.title;
          const specs = [
            { label: isEn ? "Token quota" : "Kuota token", value: formatQuota(pkg.tokenQuota, isEn) },
            { label: isEn ? "Active period" : "Masa aktif", value: formatDuration(pkg.durationDays, isEn) },
            ...(perMillion != null
              ? [{ label: isEn ? "Per 1M tokens" : "Per 1 juta token", value: `≈ Rp${nf(perMillion)}` }]
              : []),
          ];

          return (
            <article
              key={pkg.id}
              className={`lp-card flex flex-col p-6 sm:p-7 ${pkg.highlight ? "lp-invert" : ""} ${soldOut ? "opacity-60" : ""}`}
            >
              {/* Baris atas: kelompok model + label */}
              <div className="flex min-h-6 items-center justify-between gap-3">
                <div className="lp-eyebrow flex min-w-0 items-center gap-2">
                  <MonoBrandIcon group={pkg.group} onLight={pkg.highlight} />
                  <span className="truncate">{groupTitle}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {pkg.highlight && <span className="lp-tag">{isEn ? "Best value" : "Terlaris"}</span>}
                  {pkg.isPromo && <span className="lp-tag">Promo</span>}
                </div>
              </div>

              <h3 className="mt-5 break-words text-[17px] font-medium leading-snug tracking-tight text-foreground">
                {pkg.name}
              </h3>

              {/* Harga */}
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-sm text-muted-foreground">Rp</span>
                <span className="lp-display text-5xl text-foreground">{nf(pkg.price)}</span>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {isEn ? "One-time payment" : "Sekali bayar"}
                {pkg.toksPrice != null && pkg.toksPrice > 0 && (
                  <>
                    {" · "}
                    {isEn ? "or" : "atau"} {nf(pkg.toksPrice)} TOKS
                  </>
                )}
              </p>

              {/* Rincian paket */}
              <dl className="mt-6 border-t text-[13px]">
                {specs.map((s) => (
                  <div key={s.label} className="flex items-baseline justify-between gap-4 border-b py-3">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd className="text-right font-medium text-foreground">{s.value}</dd>
                  </div>
                ))}
              </dl>

              {extraFeatures.length > 0 && (
                <ul className="mt-5 space-y-2 text-[13px] leading-relaxed text-muted-foreground">
                  {extraFeatures.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <svg viewBox="0 0 24 24" fill="none" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden>
                        <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="min-w-0 break-words">{f}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto pt-7">
                {lowStock && (
                  <p className="mb-3 text-center text-[12px] text-muted-foreground">
                    {isEn ? `${nf(pkg.stock)} left` : `Tersisa ${nf(pkg.stock)}`}
                  </p>
                )}
                {soldOut ? (
                  <span className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-full border px-4 text-sm font-medium text-muted-foreground">
                    {isEn ? "Sold out" : "Stok habis"}
                  </span>
                ) : (
                  <Link
                    href={`/checkout/${pkg.id}`}
                    className={`${pkg.highlight ? "lp-btn" : "lp-btn-ghost"} min-h-12 w-full px-4 text-sm`}
                  >
                    {isEn ? "Buy package" : "Beli paket"}
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {canCollapse && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowSoldOut((v) => !v)}
            aria-expanded={showSoldOut}
            className="lp-chip inline-flex min-h-11 items-center gap-2 px-5 text-[13px] font-medium"
          >
            {showSoldOut
              ? isEn
                ? "Hide sold-out packages"
                : "Sembunyikan paket yang habis"
              : isEn
                ? `Show ${nf(soldOutCount)} sold-out packages`
                : `Lihat ${nf(soldOutCount)} paket yang stoknya habis`}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className={`h-3.5 w-3.5 transition-transform duration-200 ${showSoldOut ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
