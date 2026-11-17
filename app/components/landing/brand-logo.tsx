/**
 * Logo 9inference untuk landing page: ikon tiga bar (banyak model → satu
 * gateway) dengan satu potongan hijau, ditambah wordmark huruf kecil.
 * Ikon memakai currentColor, jadi otomatis hitam di latar terang dan putih
 * di latar gelap.
 */

const GREEN = "#19e76e";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 20" className={className} aria-hidden="true">
      <rect x="0" y="0" width="22" height="4" fill="currentColor" />
      <rect x="0" y="8" width="13" height="4" fill="currentColor" />
      <rect x="16" y="8" width="6" height="4" fill={GREEN} />
      <rect x="0" y="16" width="22" height="4" fill="currentColor" />
    </svg>
  );
}

export function BrandLogo({ className = "", size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const text = size === "lg" ? "text-[44px]" : "text-[22px]";
  const mark = size === "lg" ? "h-10" : "h-[20px]";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className={`${mark} w-auto shrink-0`} />
      <span className={`lp-display ${text} !tracking-[-0.05em]`}>9inference</span>
    </span>
  );
}
