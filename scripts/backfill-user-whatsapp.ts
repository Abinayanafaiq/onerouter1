/**
 * Backfill User.whatsapp from the most recent non-null Order.whatsapp.
 * Idempotent: only fills when User.whatsapp is null.
 *
 * Run with:
 *   npx tsx scripts/backfill-user-whatsapp.ts
 * or:
 *   npx ts-node scripts/backfill-user-whatsapp.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { whatsapp: null },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.log("No users need backfill (all have whatsapp or no users).");
    return;
  }

  let updated = 0;
  for (const user of users) {
    const latestOrder = await prisma.order.findFirst({
      where: { userId: user.id, whatsapp: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { whatsapp: true },
    });

    if (latestOrder?.whatsapp) {
      await prisma.user.update({
        where: { id: user.id },
        data: { whatsapp: latestOrder.whatsapp },
      });
      console.log(`  ${user.email} -> ${latestOrder.whatsapp}`);
      updated++;
    }
  }

  console.log(`Backfilled ${updated} of ${users.length} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
