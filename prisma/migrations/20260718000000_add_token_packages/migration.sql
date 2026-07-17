ALTER TABLE "Package"
ADD COLUMN IF NOT EXISTS "productType" TEXT NOT NULL DEFAULT 'LEGACY';

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "productTypeSnapshot" TEXT,
ADD COLUMN IF NOT EXISTS "tokenQuotaSnapshot" BIGINT,
ADD COLUMN IF NOT EXISTS "durationHoursSnapshot" INTEGER,
ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP(3);

ALTER TABLE "ApiKey"
ADD COLUMN IF NOT EXISTS "billingMode" TEXT NOT NULL DEFAULT 'PAYG';

CREATE TABLE IF NOT EXISTS "TokenReservation" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "reservedTokens" BIGINT NOT NULL,
  "consumedTokens" BIGINT NOT NULL DEFAULT 0,
  "releasedTokens" BIGINT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  CONSTRAINT "TokenReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TokenReservation_apiKeyId_fkey"
    FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TokenReservation_requestId_key"
ON "TokenReservation"("requestId");

CREATE INDEX IF NOT EXISTS "TokenReservation_apiKeyId_status_createdAt_idx"
ON "TokenReservation"("apiKeyId", "status", "createdAt");

INSERT INTO "Package" (
  "id", "name", "description", "tokenQuota", "price", "durationDays",
  "isActive", "sort", "stock", "productType", "createdAt"
)
VALUES
  ('token-20m-1d', 'Paket 20M', '20 juta token untuk pemakaian selama 24 jam', 20000000, 22000, 1, true, 20, 100, 'TOKEN_PACKAGE', CURRENT_TIMESTAMP),
  ('token-40m-1d', 'Paket 40M', '40 juta token untuk pemakaian selama 24 jam', 40000000, 25000, 1, true, 21, 100, 'TOKEN_PACKAGE', CURRENT_TIMESTAMP),
  ('token-50m-1d', 'Paket 50M', '50 juta token untuk pemakaian selama 24 jam', 50000000, 30000, 1, true, 22, 100, 'TOKEN_PACKAGE', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "tokenQuota" = EXCLUDED."tokenQuota",
  "price" = EXCLUDED."price",
  "durationDays" = EXCLUDED."durationDays",
  "isActive" = EXCLUDED."isActive",
  "sort" = EXCLUDED."sort",
  "productType" = EXCLUDED."productType";
