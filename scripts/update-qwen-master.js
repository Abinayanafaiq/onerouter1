require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const result = await p.aIModel.updateMany({
    where: { masterId: 'qwen-7-plus' },
    data: { masterId: 'qwen3.7-plus' },
  });
  console.log('Updated rows:', result.count);

  const rows = await p.aIModel.findMany({
    where: { OR: [{ modelId: 'qwen3.7-plus' }, { masterId: 'qwen3.7-plus' }] },
    select: { modelId: true, masterId: true, name: true, provider: true },
  });
  console.log(JSON.stringify(rows, null, 2));
  await p.$disconnect();
})();
