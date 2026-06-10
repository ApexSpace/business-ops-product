-- Drop legacy Plan model and planId from business_subscriptions
ALTER TABLE "business_subscriptions" DROP CONSTRAINT IF EXISTS "business_subscriptions_planId_fkey";
DROP INDEX IF EXISTS "business_subscriptions_planId_idx";
ALTER TABLE "business_subscriptions" DROP COLUMN IF EXISTS "planId";
DROP TABLE IF EXISTS "plans";
DROP TYPE IF EXISTS "PlanStatus";
