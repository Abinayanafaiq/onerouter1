import { prisma } from "./prisma";
import type { Package } from "@prisma/client";

export type PackageDef = Package & { features: string[]; highlight?: boolean };

/**
 * Feature lines that CANNOT be derived from package columns. The token quota
 * and active-duration lines are generated from the actual DB values in
 * enrich() — never hardcoded — so the pricing page can never drift out of
 * sync when an admin edits a package's quota or duration.
 */
const EXTRA_FEATURES: Record<string, string[]> = {
  "token-20m-1d": ["Semua model aktif", "Input + output dihitung"],
  "token-40m-1d": ["Semua model aktif", "Input + output dihitung"],
  "token-50m-1d": ["Semua model aktif", "Input + output dihitung"],
  mini: [
    "Semua model AI tersedia",
    "Limit request 20/menit",
  ],
  mid: [
    "Semua model AI tersedia",
    "Limit request 60/menit",
    "Priority support",
  ],
  pro: [
    "Semua model AI tersedia",
    "Tanpa limit request",
    "Priority support",
    "Akses model premium maks",
  ],
};

const HIGHLIGHTS = new Set(["token-40m-1d"]);

/** "10 Juta Token" — derived from the DB quota, never a stale hardcoded number. */
export function formatTokenQuota(tokenQuota: bigint): string {
  const quota = Number(tokenQuota);
  if (quota >= 1_000_000) {
    const millions = quota / 1_000_000;
    return `${millions.toLocaleString("id-ID", { maximumFractionDigits: 1 })} Juta Token`;
  }
  return `${quota.toLocaleString("id-ID")} Token`;
}

/** "Aktif 24 jam" for 1-day packages, otherwise "Aktif N hari". */
export function formatDuration(durationDays: number): string {
  return durationDays === 1 ? "Aktif 24 jam" : `Aktif ${durationDays} hari`;
}

function enrich(p: Package): PackageDef {
  return {
    ...p,
    features: [
      formatTokenQuota(p.tokenQuota),
      formatDuration(p.durationDays),
      ...(EXTRA_FEATURES[p.id] ?? []),
    ],
    highlight: HIGHLIGHTS.has(p.id),
  };
}

export async function getAllPackages(): Promise<PackageDef[]> {
  const packages = await prisma.package.findMany({
    where: { isActive: true, productType: "TOKEN_PACKAGE" },
    orderBy: { sort: "asc" },
  });
  return packages.map(enrich);
}

export async function findPackage(id: string): Promise<PackageDef | null> {
  const p = await prisma.package.findUnique({ where: { id } });
  if (!p || !p.isActive) return null;
  return enrich(p);
}
