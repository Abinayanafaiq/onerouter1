-- Additive-only migration for NOWPayments crypto payment integration.
-- No DROP, no TRUNCATE, no ALTER ... DROP COLUMN. All new columns are nullable.
-- Existing rows will have NULL for the new columns — no data is touched.

-- AlterTable: add nullable columns to "Order" for NOWPayments invoice tracking
ALTER TABLE "Order" ADD COLUMN "nowpaymentsInvoiceId" TEXT;
ALTER TABLE "Order" ADD COLUMN "nowpaymentsPayCurrency" TEXT;
