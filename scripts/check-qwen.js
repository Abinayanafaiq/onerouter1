require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const rows = await p.aIModel.findMany({
    where: { OR: [{ modelId: { contains: 'qwen' } }, { masterId: { contains: 'qwen' } }] },
  });
  console.log(JSON.stringify(rows, null, 2));
  await p.$disconnect();
})();
