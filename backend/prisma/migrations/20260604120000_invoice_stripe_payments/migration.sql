-- CreateEnum (idempotent for partial retries)
DO $$ BEGIN
  CREATE TYPE "InvoicePaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'STRIPE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "publicToken" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "publicUrl" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paymentStatus" "InvoicePaymentStatus";
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "remainingAmount" DECIMAL(12,2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "lastPaymentAt" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "stripeCheckoutUrl" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "stripePaymentLinkId" TEXT;

ALTER TABLE "invoices" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';
UPDATE "invoices" SET "paymentStatus" = 'UNPAID' WHERE "paymentStatus" IS NULL;
ALTER TABLE "invoices" ALTER COLUMN "paymentStatus" SET NOT NULL;

ALTER TABLE "invoices" ALTER COLUMN "paidAmount" SET DEFAULT 0;
UPDATE "invoices" SET "paidAmount" = 0 WHERE "paidAmount" IS NULL;
ALTER TABLE "invoices" ALTER COLUMN "paidAmount" SET NOT NULL;

ALTER TABLE "invoices" ALTER COLUMN "remainingAmount" SET DEFAULT 0;
UPDATE "invoices" SET "remainingAmount" = "balanceDue" WHERE "remainingAmount" IS NULL;
ALTER TABLE "invoices" ALTER COLUMN "remainingAmount" SET NOT NULL;

-- Backfill public tokens for existing invoices
UPDATE "invoices"
SET "publicToken" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "publicToken" IS NULL;

-- Sync payment tracking fields from existing balances
UPDATE "invoices"
SET
  "remainingAmount" = "balanceDue",
  "paidAmount" = GREATEST("totalAmount" - "balanceDue", 0),
  "paymentStatus" = CASE
    WHEN "status" = 'VOID' THEN 'UNPAID'::"InvoicePaymentStatus"
    WHEN "balanceDue" <= 0 AND "totalAmount" > 0 THEN 'PAID'::"InvoicePaymentStatus"
    WHEN ("totalAmount" - "balanceDue") > 0 AND "balanceDue" > 0 THEN 'PARTIALLY_PAID'::"InvoicePaymentStatus"
    ELSE 'UNPAID'::"InvoicePaymentStatus"
  END
WHERE "deletedAt" IS NULL;

ALTER TABLE "invoices" ALTER COLUMN "publicToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_publicToken_key" ON "invoices"("publicToken");
CREATE INDEX IF NOT EXISTS "invoices_publicToken_idx" ON "invoices"("publicToken");

-- AlterTable: payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" "PaymentProvider";
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "providerMetadata" JSONB;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripeChargeId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripeRefundId" TEXT;

ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'MANUAL';
UPDATE "payments" SET "provider" = 'MANUAL' WHERE "provider" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "provider" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_stripeCheckoutSessionId_key" ON "payments"("stripeCheckoutSessionId");
CREATE INDEX IF NOT EXISTS "payments_stripePaymentIntentId_idx" ON "payments"("stripePaymentIntentId");
