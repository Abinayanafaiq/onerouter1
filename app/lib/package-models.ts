import { prisma } from "./prisma";

export async function getAllPackageModels() {
  return prisma.packageModel.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }] });
}

export async function getEnabledPackageModels() {
  return prisma.packageModel.findMany({
    where: { enabled: true },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
  });
}

export async function resolvePackageModel(modelId: string) {
  // Public callers never need the private `wz/` namespace.
  const publicId = modelId.startsWith("wz/") ? modelId.slice(3) : modelId;
  return prisma.packageModel.findUnique({ where: { modelId: publicId } });
}
