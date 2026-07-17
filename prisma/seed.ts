import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PACKAGES = [
  {
    id: "token-20m-1d",
    name: "Paket 20M",
    description: "20 juta token untuk pemakaian selama 24 jam",
    tokenQuota: BigInt(20_000_000),
    price: 22_000,
    durationDays: 1,
    productType: "TOKEN_PACKAGE",
    sort: 20,
    stock: 100,
  },
  {
    id: "token-40m-1d",
    name: "Paket 40M",
    description: "40 juta token untuk pemakaian selama 24 jam",
    tokenQuota: BigInt(40_000_000),
    price: 25_000,
    durationDays: 1,
    productType: "TOKEN_PACKAGE",
    sort: 21,
    stock: 100,
  },
  {
    id: "token-50m-1d",
    name: "Paket 50M",
    description: "50 juta token untuk pemakaian selama 24 jam",
    tokenQuota: BigInt(50_000_000),
    price: 30_000,
    durationDays: 1,
    productType: "TOKEN_PACKAGE",
    sort: 22,
    stock: 100,
  },
  {
    id: "mini",
    name: "Mini",
    description: "Cocok untuk coba-coba & pemakaian ringan",
    tokenQuota: BigInt(10_000_000),
    price: 10_000,
    durationDays: 14,
    sort: 1,
    stock: 100,
    productType: "LEGACY",
  },
  {
    id: "mid",
    name: "Mid",
    description: "Pilihan populer untuk pemakaian harian",
    tokenQuota: BigInt(25_000_000),
    price: 25_000,
    durationDays: 14,
    sort: 2,
    stock: 100,
    productType: "LEGACY",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Buang concern token, fokus kerja",
    tokenQuota: BigInt(40_000_000),
    price: 40_000,
    durationDays: 14,
    sort: 3,
    stock: 100,
    productType: "LEGACY",
  },
] as const;

async function main() {
  console.log("Seeding packages...");

  for (const pkg of PACKAGES) {
    await prisma.package.upsert({
      where: { id: pkg.id },
      update: {
        name: pkg.name,
        description: pkg.description,
        tokenQuota: pkg.tokenQuota,
        price: pkg.price,
        durationDays: pkg.durationDays,
        sort: pkg.sort,
        stock: pkg.stock,
        productType: pkg.productType,
      },
      create: {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        tokenQuota: pkg.tokenQuota,
        price: pkg.price,
        durationDays: pkg.durationDays,
        sort: pkg.sort,
        stock: pkg.stock,
        productType: pkg.productType,
      },
    });
    console.log(`  ✓ ${pkg.name} (${pkg.id})`);
  }

  console.log("Done seeding.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
