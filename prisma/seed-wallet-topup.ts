import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.package.upsert({
    where: { id: "wallet-topup" },
    update: {
      name: "Wallet Top Up",
      description: "Top up saldo wallet custom nominal",
      price: 0,
      tokenQuota: BigInt(0),
      durationDays: 0,
      sort: 99,
      stock: 999999,
      isActive: true,
    },
    create: {
      id: "wallet-topup",
      name: "Wallet Top Up",
      description: "Top up saldo wallet custom nominal",
      price: 0,
      tokenQuota: BigInt(0),
      durationDays: 0,
      sort: 99,
      stock: 999999,
      isActive: true,
    },
  });
  console.log("✓ wallet-topup package seeded");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
