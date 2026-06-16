-- Backfill trialing subscriptions that inherited the old MANUAL default
UPDATE "business_subscriptions"
SET "billingSource" = 'NOT_SELECTED'
WHERE "status" = 'TRIALING' AND "billingSource" = 'MANUAL';

-- AlterTable
ALTER TABLE "business_subscriptions" ALTER COLUMN "billingSource" SET DEFAULT 'NOT_SELECTED';
