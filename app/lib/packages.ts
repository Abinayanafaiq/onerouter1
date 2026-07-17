import { prisma } from "./prisma";
import type { Package } from "@prisma/client";

export type PackageDef = Package & { features: string[]; highlight?: boolean };

const FEATURES: Record<string, string[]> = {
  "token-20m-1d": ["20 Juta Token", "Aktif 24 jam", "Semua model aktif", "Input + output dihitung"],
  "token-40m-1d": ["40 Juta Token", "Aktif 24 jam", "Semua model aktif", "Input + output dihitung"],
  "token-50m-1d": ["50 Juta Token", "Aktif 24 jam", "Semua model aktif", "Input + output dihitung"],
  mini: [
    "10 Juta Token",
    "Aktif 14 hari",
    "Semua model AI tersedia",
    "Limit request 20/menit",
  ],
  mid: [
    "25 Juta Token",
    "Aktif 14 hari",
    "Semua model AI tersedia",
    "Limit request 60/menit",
    "Priority support",
  ],
  pro: [
    "40 Juta Token",
    "Aktif 14 hari",
    "Semua model AI tersedia",
    "Tanpa limit request",
    "Priority support",
    "Akses model premium maks",
  ],
};

const HIGHLIGHTS = new Set(["token-40m-1d"]);

function enrich(p: Package): PackageDef {
  return {
    ...p,
    features: FEATURES[p.id] ?? [],
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
