require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const a = await p.aIModel.findMany({
    where: { OR: [{ modelId: { contains: 'glm' } }, { masterId: { contains: 'glm' } }] },
    orderBy: { sort: 'asc' },
  });
  console.log('=== AIModel (PAYG) GLM ===');
  console.log(JSON.stringify(a, null, 2));
  const b = await p.packageModel.findMany({
    where: { OR: [{ modelId: { contains: 'glm' } }, { upstreamId: { contains: 'glm' } }] },
    orderBy: { sort: 'asc' },
  });
  console.log('=== PackageModel GLM ===');
  console.log(JSON.stringify(b, null, 2));
  await p.$disconnect();
})();
