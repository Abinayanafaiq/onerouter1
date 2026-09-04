require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const pkgs = await p.package.findMany({
    where: {
      allowedModels: { hasSome: ['glm-5.2', 'glm-5.3-flash'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(pkgs, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
  await p.$disconnect();
})();
