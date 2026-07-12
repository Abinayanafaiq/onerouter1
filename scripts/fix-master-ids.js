const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const models = await p.aIModel.findMany();
  let updated = 0;
  for (const m of models) {
    const newMasterId = m.masterId.replace(/^prokuy\//, "");
    if (newMasterId !== m.masterId) {
      await p.aIModel.update({
        where: { id: m.id },
        data: { masterId: newMasterId },
      });
      console.log(`  ${m.masterId} -> ${newMasterId}`);
      updated++;
    }
  }
  console.log(`Updated ${updated} model(s).`);
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
