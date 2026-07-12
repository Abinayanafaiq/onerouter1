import { PrismaClient } from "@prisma/client";
import { MODEL_SEED_DATA } from "../app/lib/providers";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding AI models...");

  for (const m of MODEL_SEED_DATA) {
    await prisma.aIModel.upsert({
      where: { modelId: m.modelId },
      update: {
        masterId: m.masterId,
        name: m.name,
        provider: m.provider,
        description: m.description,
        contextWindow: m.contextWindow,
        supportsText: m.supportsText,
        supportsImages: m.supportsImages,
        supportsStreaming: m.supportsStreaming,
        sort: m.sort,
      },
      create: {
        modelId: m.modelId,
        masterId: m.masterId,
        name: m.name,
        provider: m.provider,
        description: m.description,
        contextWindow: m.contextWindow,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        supportsText: m.supportsText,
        supportsImages: m.supportsImages,
        supportsStreaming: m.supportsStreaming,
        enabled: true,
        maintenanceMode: false,
        sort: m.sort,
      },
    });
    console.log(`  \u2713 ${m.name} (${m.modelId}) [${m.provider}]`);
  }

  console.log("Done seeding models.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
