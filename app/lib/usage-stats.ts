import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { idrToToks } from "./constants";

/**
 * Wallet + usage summary for a single user. All monetary values are in IDR
 * (the internal storage unit); the UI converts to TOKS (1 TOKS = Rp1.000).
 */
export type WalletSummary = {
  balance: number;
  balanceToks: number;
  totalPurchased: number;
  totalUsed: number;
  totalRequests: number;
  avgCostPerRequest: number;
  estimatedRemainingRequests: number | null;
  lastTopUpAt: string | null;
  lastUsageAt: string | null;
};

export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const balance = Number(wallet?.balance ?? 0);

  // Total purchased = sum of positive credit transactions (TOPUP / ADMIN_ADD / REFUND)
  const purchasedAgg = wallet
    ? await prisma.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          type: { in: ["TOPUP", "ADMIN_ADD", "REFUND"] },
        },
        _sum: { amount: true },
      })
    : null;
  const totalPurchased = Number(purchasedAgg?._sum.amount ?? 0);

  // Total used + request count come from successful usage logs
  const usageAgg = await prisma.usageLog.aggregate({
    where: { userId, status: "success" },
    _sum: { totalCost: true },
    _count: true,
  });
  const totalUsed = Number(usageAgg._sum.totalCost ?? 0);
  const totalRequests = usageAgg._count;

  const avgCostPerRequest = totalRequests > 0 ? totalUsed / totalRequests : 0;
  const estimatedRemainingRequests =
    avgCostPerRequest > 0 ? Math.floor(balance / avgCostPerRequest) : null;

  // Last top-up
  const lastTopUp = wallet
    ? await prisma.walletTransaction.findFirst({
        where: {
          walletId: wallet.id,
          type: { in: ["TOPUP", "ADMIN_ADD"] },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
    : null;

  // Last usage
  const lastUsage = await prisma.usageLog.findFirst({
    where: { userId, status: "success" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return {
    balance,
    balanceToks: idrToToks(balance),
    totalPurchased,
    totalUsed,
    totalRequests,
    avgCostPerRequest,
    estimatedRemainingRequests,
    lastTopUpAt: lastTopUp?.createdAt.toISOString() ?? null,
    lastUsageAt: lastUsage?.createdAt.toISOString() ?? null,
  };
}

export type UsageLogRow = {
  id: string;
  createdAt: string;
  model: string;
  modelName: string;
  provider: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  remainingBalance: number;
};

export type UsageLogFilter = {
  userId: string;
  page?: number;
  pageSize?: number;
  from?: Date | null;
  to?: Date | null;
  model?: string | null;
  provider?: string | null;
  status?: string | null;
};

export type UsageLogPage = {
  rows: UsageLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function buildWhere(filter: UsageLogFilter): Prisma.UsageLogWhereInput {
  const where: Prisma.UsageLogWhereInput = { userId: filter.userId };
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) where.createdAt.gte = filter.from;
    if (filter.to) where.createdAt.lte = filter.to;
  }
  if (filter.model) where.model = filter.model;
  if (filter.provider) where.provider = filter.provider;
  if (filter.status) where.status = filter.status;
  return where;
}

export async function getUsageLogs(filter: UsageLogFilter): Promise<UsageLogPage> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 20));
  const where = buildWhere(filter);

  const [total, logs] = await Promise.all([
    prisma.usageLog.count({ where }),
    prisma.usageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { aiModel: { select: { name: true } } },
    }),
  ]);

  const rows: UsageLogRow[] = logs.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    model: l.model,
    modelName: l.aiModel?.name ?? l.model,
    provider: l.provider,
    status: l.status,
    inputTokens: l.inputTokens,
    outputTokens: l.outputTokens,
    totalTokens: l.totalTokens,
    totalCost: Number(l.totalCost),
    remainingBalance: Number(l.remainingBalance),
  }));

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getUsageLogById(userId: string, id: string): Promise<UsageLogRow | null> {
  const l = await prisma.usageLog.findFirst({
    where: { id, userId },
    include: { aiModel: { select: { name: true } } },
  });
  if (!l) return null;
  return {
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    model: l.model,
    modelName: l.aiModel?.name ?? l.model,
    provider: l.provider,
    status: l.status,
    inputTokens: l.inputTokens,
    outputTokens: l.outputTokens,
    totalTokens: l.totalTokens,
    totalCost: Number(l.totalCost),
    remainingBalance: Number(l.remainingBalance),
  };
}

export type ModelUsageRow = {
  modelId: string | null;
  model: string;
  modelName: string;
  provider: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  avgCostPerRequest: number;
};

export async function getUsageByModel(
  userId: string,
  opts?: { from?: Date | null; to?: Date | null },
): Promise<ModelUsageRow[]> {
  const where: Prisma.UsageLogWhereInput = { userId, status: "success" };
  if (opts?.from || opts?.to) {
    where.createdAt = {};
    if (opts.from) where.createdAt.gte = opts.from;
    if (opts.to) where.createdAt.lte = opts.to;
  }

  const grouped = await prisma.usageLog.groupBy({
    by: ["model", "provider", "modelId"],
    where,
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      totalCost: true,
    },
    _count: true,
  });

  // Resolve friendly names
  const modelIds = grouped.map((g) => g.modelId).filter((v): v is string => !!v);
  const models = modelIds.length
    ? await prisma.aIModel.findMany({
        where: { id: { in: modelIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(models.map((m) => [m.id, m.name]));

  const rows: ModelUsageRow[] = grouped.map((g) => {
    const requests = g._count;
    const totalCost = Number(g._sum.totalCost ?? 0);
    return {
      modelId: g.modelId,
      model: g.model,
      modelName: (g.modelId && nameById.get(g.modelId)) || g.model,
      provider: g.provider,
      requests,
      inputTokens: g._sum.inputTokens ?? 0,
      outputTokens: g._sum.outputTokens ?? 0,
      totalTokens: g._sum.totalTokens ?? 0,
      totalCost,
      avgCostPerRequest: requests > 0 ? totalCost / requests : 0,
    };
  });

  rows.sort((a, b) => b.totalCost - a.totalCost);
  return rows;
}

/** Distinct models & providers this user has used (for filter dropdowns). */
export async function getUsageFilterOptions(
  userId: string,
): Promise<{ models: { model: string; name: string }[]; providers: string[] }> {
  const grouped = await prisma.usageLog.groupBy({
    by: ["model", "modelId", "provider"],
    where: { userId },
  });
  const modelIds = grouped.map((g) => g.modelId).filter((v): v is string => !!v);
  const models = modelIds.length
    ? await prisma.aIModel.findMany({
        where: { id: { in: modelIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(models.map((m) => [m.id, m.name]));

  const modelMap = new Map<string, string>();
  const providerSet = new Set<string>();
  for (const g of grouped) {
    if (!modelMap.has(g.model)) {
      modelMap.set(g.model, (g.modelId && nameById.get(g.modelId)) || g.model);
    }
    if (g.provider) providerSet.add(g.provider);
  }

  return {
    models: Array.from(modelMap.entries()).map(([model, name]) => ({ model, name })),
    providers: Array.from(providerSet),
  };
}
