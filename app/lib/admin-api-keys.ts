import { prisma } from "./prisma";
import { toApiKeyView } from "./api-keys";
import type { ApiKeyView } from "./api-keys";
import { idrToToks } from "./constants";

export type AdminApiKeyView = ApiKeyView & {
  userEmail: string;
  userId: string;
};

export async function listAllApiKeys(): Promise<AdminApiKeyView[]> {
  const keys = await prisma.apiKey.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return keys.map((k) => ({
    ...toApiKeyView(k),
    userEmail: k.user.email,
    userId: k.userId,
  }));
}

/** Admin can disable/enable any key regardless of owner. */
export async function adminSetApiKeyEnabled(
  keyId: string,
  enabled: boolean,
): Promise<ApiKeyView | null> {
  const existing = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!existing) return null;
  const updated = await prisma.apiKey.update({
    where: { id: keyId },
    data: { enabled },
  });
  return toApiKeyView(updated);
}

/** Admin can delete (revoke) any key — removes usage history too. */
export async function adminDeleteApiKey(keyId: string): Promise<boolean> {
  const existing = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!existing) return false;
  await prisma.apiKey.delete({ where: { id: keyId } });
  return true;
}

export type AdminKeyAnalytics = {
  totals: {
    totalKeys: number;
    activeKeys: number;
    disabledKeys: number;
    expiredKeys: number;
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalRevenue: number;
    failedRequests: number;
    avgResponseTime: number;
  };
  topUsers: {
    userId: string;
    email: string;
    requests: number;
    totalCost: number;
    totalTokens: number;
    keyCount: number;
  }[];
  revenueByKey: {
    keyId: string;
    keyName: string;
    userEmail: string;
    requests: number;
    totalCost: number;
    totalTokens: number;
  }[];
  tokenUsageByKey: {
    keyId: string;
    keyName: string;
    userEmail: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }[];
  recentAbuse: {
    id: string;
    createdAt: string;
    userEmail: string;
    keyName: string;
    endpoint: string;
    model: string;
    statusCode: number;
    clientIp: string | null;
  }[];
};

export async function getAdminKeyAnalytics(): Promise<AdminKeyAnalytics> {
  const [
    totalKeys,
    activeKeys,
    disabledKeys,
    expiredKeys,
    agg,
    successCount,
    failedCount,
    avgAgg,
    topUsersRaw,
    revenueByKeyRaw,
    tokenByKeyRaw,
    recentAbuseRaw,
  ] = await Promise.all([
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: { isActive: true, enabled: true } }),
    prisma.apiKey.count({ where: { enabled: false } }),
    prisma.apiKey.count({
      where: { expiresAt: { lt: new Date() } },
    }),
    prisma.apiRequestLog.aggregate({
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true, totalCost: true },
      _count: true,
    }),
    prisma.apiRequestLog.count({ where: { success: true } }),
    prisma.apiRequestLog.count({ where: { success: false } }),
    prisma.apiRequestLog.aggregate({ _avg: { responseTime: true } }),
    prisma.apiRequestLog.groupBy({
      by: ["userId"],
      _sum: { totalCost: true, totalTokens: true },
      _count: true,
      orderBy: { _sum: { totalCost: "desc" } },
      take: 10,
    }),
    prisma.apiRequestLog.groupBy({
      by: ["apiKeyId"],
      _sum: { totalCost: true, totalTokens: true },
      _count: true,
      orderBy: { _sum: { totalCost: "desc" } },
      take: 10,
    }),
    prisma.apiRequestLog.groupBy({
      by: ["apiKeyId"],
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      orderBy: { _sum: { totalTokens: "desc" } },
      take: 10,
    }),
    prisma.apiRequestLog.findMany({
      where: { success: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        apiKey: {
          select: { name: true, label: true, user: { select: { email: true } } },
        },
      },
    }),
  ]);

  // Resolve users for top users
  const userIds = topUsersRaw.map((u) => u.userId).filter((v): v is string => !!v);
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
    : [];
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const topUsers: AdminKeyAnalytics["topUsers"] = [];
  for (const u of topUsersRaw) {
    if (!u.userId) continue;
    topUsers.push({
      userId: u.userId,
      email: emailById.get(u.userId) ?? "—",
      requests: u._count,
      totalCost: Number(u._sum.totalCost ?? 0),
      totalTokens: u._sum.totalTokens ?? 0,
      keyCount: await prisma.apiKey.count({ where: { userId: u.userId } }),
    });
  }

  // Resolve keys for revenue/token by key
  const keyIds = Array.from(
    new Set([...revenueByKeyRaw.map((r) => r.apiKeyId), ...tokenByKeyRaw.map((r) => r.apiKeyId)]),
  );
  const keys = keyIds.length
    ? await prisma.apiKey.findMany({
        where: { id: { in: keyIds } },
        select: { id: true, name: true, label: true, user: { select: { email: true } } },
      })
    : [];
  const keyInfoById = new Map(keys.map((k) => [k.id, k]));

  const revenueByKey: AdminKeyAnalytics["revenueByKey"] = revenueByKeyRaw.map((r) => {
    const info = keyInfoById.get(r.apiKeyId);
    return {
      keyId: r.apiKeyId,
      keyName: info?.name || info?.label || "—",
      userEmail: info?.user.email ?? "—",
      requests: r._count,
      totalCost: Number(r._sum.totalCost ?? 0),
      totalTokens: r._sum.totalTokens ?? 0,
    };
  });

  const tokenUsageByKey: AdminKeyAnalytics["tokenUsageByKey"] = tokenByKeyRaw.map((r) => {
    const info = keyInfoById.get(r.apiKeyId);
    return {
      keyId: r.apiKeyId,
      keyName: info?.name || info?.label || "—",
      userEmail: info?.user.email ?? "—",
      inputTokens: r._sum.inputTokens ?? 0,
      outputTokens: r._sum.outputTokens ?? 0,
      totalTokens: r._sum.totalTokens ?? 0,
    };
  });

  const recentAbuse: AdminKeyAnalytics["recentAbuse"] = recentAbuseRaw.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    userEmail: l.apiKey?.user.email ?? "—",
    keyName: l.apiKey?.name || l.apiKey?.label || "—",
    endpoint: l.endpoint,
    model: l.model,
    statusCode: l.statusCode,
    clientIp: l.clientIp,
  }));

  const totalRequests = agg._count;
  return {
    totals: {
      totalKeys,
      activeKeys,
      disabledKeys,
      expiredKeys,
      totalRequests,
      totalInputTokens: agg._sum.inputTokens ?? 0,
      totalOutputTokens: agg._sum.outputTokens ?? 0,
      totalTokens: agg._sum.totalTokens ?? 0,
      totalRevenue: Number(agg._sum.totalCost ?? 0),
      failedRequests: failedCount,
      avgResponseTime: Math.round(avgAgg._avg.responseTime ?? 0),
    },
    topUsers,
    revenueByKey,
    tokenUsageByKey,
    recentAbuse,
  };
}

// Re-export for convenience
export { idrToToks };
