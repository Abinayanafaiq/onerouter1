import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { idrToToks } from "./constants";

export type ApiRequestLogData = {
  apiKeyId: string;
  userId: string | null;
  provider: string;
  model: string;
  endpoint: string;
  method: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  remainingBalance: number;
  responseTime: number;
  statusCode: number;
  success: boolean;
  clientIp: string | null;
  userAgent: string | null;
};

function toDecimal6(n: number) {
  return new Prisma.Decimal(Number.isFinite(n) ? n : 0).toDecimalPlaces(6);
}
function toDecimal4(n: number) {
  return new Prisma.Decimal(Number.isFinite(n) ? n : 0).toDecimalPlaces(4);
}

/**
 * Build the ApiRequestLog `data` object for a Prisma create. Kept separate so
 * it can be created either standalone or inside an existing transaction (tx).
 */
export function buildApiRequestLogData(
  d: ApiRequestLogData,
): Prisma.ApiRequestLogUncheckedCreateInput {
  return {
    apiKeyId: d.apiKeyId,
    userId: d.userId,
    provider: d.provider,
    model: d.model,
    endpoint: d.endpoint,
    method: d.method,
    inputTokens: d.inputTokens,
    outputTokens: d.outputTokens,
    totalTokens: d.totalTokens,
    inputCost: toDecimal6(d.inputCost),
    outputCost: toDecimal6(d.outputCost),
    totalCost: toDecimal6(d.totalCost),
    remainingBalance: toDecimal4(d.remainingBalance),
    responseTime: Math.max(0, Math.round(d.responseTime)),
    statusCode: d.statusCode,
    success: d.success,
    clientIp: d.clientIp,
    userAgent: d.userAgent?.slice(0, 512) ?? null,
  };
}

/** Best-effort standalone log write. Never throws. */
export async function createApiRequestLog(d: ApiRequestLogData): Promise<void> {
  try {
    await prisma.apiRequestLog.create({ data: buildApiRequestLogData(d) });
  } catch (e) {
    console.error("[createApiRequestLog] failed:", e);
  }
}

export type ApiRequestRow = {
  id: string;
  createdAt: string;
  apiKeyId: string;
  keyName: string;
  endpoint: string;
  method: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  totalCostToks: number;
  remainingBalance: number;
  responseTime: number;
  statusCode: number;
  success: boolean;
  clientIp: string | null;
  userAgent: string | null;
};

export type ApiRequestFilter = {
  userId?: string; // scope to a single user (dashboard)
  apiKeyId?: string | null;
  model?: string | null;
  provider?: string | null;
  success?: boolean | null;
  from?: Date | null;
  to?: Date | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
};

export type ApiRequestPage = {
  rows: ApiRequestRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function buildWhere(filter: ApiRequestFilter): Prisma.ApiRequestLogWhereInput {
  const where: Prisma.ApiRequestLogWhereInput = {};
  if (filter.userId) where.userId = filter.userId;
  if (filter.apiKeyId) where.apiKeyId = filter.apiKeyId;
  if (filter.model) where.model = filter.model;
  if (filter.provider) where.provider = filter.provider;
  if (filter.success !== null && filter.success !== undefined) where.success = filter.success;
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) where.createdAt.gte = filter.from;
    if (filter.to) where.createdAt.lte = filter.to;
  }
  if (filter.search) {
    where.OR = [
      { model: { contains: filter.search, mode: "insensitive" } },
      { provider: { contains: filter.search, mode: "insensitive" } },
      { endpoint: { contains: filter.search, mode: "insensitive" } },
      { clientIp: { contains: filter.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function getApiRequestLogs(filter: ApiRequestFilter): Promise<ApiRequestPage> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 20));
  const where = buildWhere(filter);

  const [total, logs] = await Promise.all([
    prisma.apiRequestLog.count({ where }),
    prisma.apiRequestLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { apiKey: { select: { name: true, label: true } } },
    }),
  ]);

  const rows: ApiRequestRow[] = logs.map((l) => {
    const cost = Number(l.totalCost);
    return {
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      apiKeyId: l.apiKeyId,
      keyName: l.apiKey?.name || l.apiKey?.label || "—",
      endpoint: l.endpoint,
      method: l.method,
      model: l.model,
      provider: l.provider,
      inputTokens: l.inputTokens,
      outputTokens: l.outputTokens,
      totalTokens: l.totalTokens,
      totalCost: cost,
      totalCostToks: idrToToks(cost),
      remainingBalance: Number(l.remainingBalance),
      responseTime: l.responseTime,
      statusCode: l.statusCode,
      success: l.success,
      clientIp: l.clientIp,
      userAgent: l.userAgent,
    };
  });

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Distinct models & providers seen for a user (for filter dropdowns). */
export async function getApiRequestFilterOptions(
  userId: string,
): Promise<{ models: string[]; providers: string[] }> {
  const grouped = await prisma.apiRequestLog.groupBy({
    by: ["model", "provider"],
    where: { userId },
  });
  const models = new Set<string>();
  const providers = new Set<string>();
  for (const g of grouped) {
    if (g.model) models.add(g.model);
    if (g.provider) providers.add(g.provider);
  }
  return { models: Array.from(models), providers: Array.from(providers) };
}
