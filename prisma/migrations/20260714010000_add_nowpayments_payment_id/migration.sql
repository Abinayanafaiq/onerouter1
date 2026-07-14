-- Additive-only migration: add nowpaymentsPaymentId column to "Order".
-- No DROP, no TRUNCATE. Nullable column — existing rows get NULL.

ALTER TABLE "Order" ADD COLUMN "nowpaymentsPaymentId" TEXT;
