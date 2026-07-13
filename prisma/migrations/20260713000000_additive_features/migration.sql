-- Additive-only migration for per-user rate limit, WhatsApp, MasterApiKey, AuditLog.
-- No DROP, no TRUNCATE, no ALTER ... DROP COLUMN. All new columns are nullable.

-- AlterTable: add nullable columns to "User"
ALTER TABLE "User" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "User" ADD COLUMN "rateLimit" INTEGER;

-- CreateTable: MasterApiKey (encrypted master API keys with failover)
CREATE TABLE "MasterApiKey" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cipher" TEXT NOT NULL,
    "prefix" TEXT,
    "last4" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorStatus" INTEGER,
    "lastErrorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: composite index for fast active-key resolution
CREATE INDEX "MasterApiKey_enabled_priority_idx" ON "MasterApiKey"("enabled", "priority");

-- CreateTable: AuditLog (admin action audit trail)
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
