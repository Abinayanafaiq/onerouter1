import { prisma } from "./prisma";

/**
 * Write an audit log entry. Best-effort: never throws.
 * Used for tracking master-key mutations (create/enable/disable/delete).
 */
export async function writeAuditLog(params: {
  actorUserId: string | null;
  action: string;
  target?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        target: params.target ?? null,
      },
    });
  } catch (e) {
    console.error("[audit-log] failed to write:", e);
  }
}

export type AuditLogView = {
  id: string;
  actorUserId: string | null;
  action: string;
  target: string | null;
  createdAt: string;
};

export async function getAuditLogs(take = 100): Promise<AuditLogView[]> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
  return logs.map((l) => ({
    id: l.id,
    actorUserId: l.actorUserId,
    action: l.action,
    target: l.target,
    createdAt: l.createdAt.toISOString(),
  }));
}
