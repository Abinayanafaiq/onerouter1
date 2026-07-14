-- Additive-only migration: add cryptoExpectedAmount for direct USDT BEP20 monitoring.
-- No DROP, no TRUNCATE. Nullable column — existing rows get NULL.

ALTER TABLE "Order" ADD COLUMN "cryptoExpectedAmount" TEXT;
