import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PACKAGES = [
  {
    id: "mini",
    name: "Mini",
    description: "Cocok untuk coba-coba & pemakaian ringan",
    tokenQuota: BigInt(10_000_000),
    price: 10_000,
    durationDays: 7,
    sort: 1,
    stock: 100,
  },
  {
    id: "mid",
    name: "Mid",
    description: "Pilihan populer untuk pemakaian harian",
    tokenQuota: BigInt(25_000_000),
    price: 25_000,
    durationDays: 7,
    sort: 2,
    stock: 100,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Buang concern token, fokus kerja",
    tokenQuota: BigInt(40_000_000),
    price: 40_000,
    durationDays: 7,
    sort: 3,
    stock: 100,
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