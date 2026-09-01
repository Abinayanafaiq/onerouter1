-- Migrasi penggantian payment gateway Pakasir -> Sumopod.
-- Additive only: kolom pakasir* dipertahankan untuk riwayat order lama.
ALTER TABLE "Order"
ADD COLUMN "sumopodPaymentId" TEXT,
ADD COLUMN "sumopodExpiredAt" TIMESTAMP(3);
