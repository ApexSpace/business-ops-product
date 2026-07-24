-- Stripe-owned billing mirror: subscription status + first-class Stripe ID columns

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'UNPAID';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'INCOMPLETE';

ALTER TABLE "business_subscriptions"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "business_subscriptions_stripeSubscriptionId_key"
  ON "business_subscriptions"("stripeSubscriptionId");

CREATE INDEX IF NOT EXISTS "business_subscriptions_stripeCustomerId_idx"
  ON "business_subscriptions"("stripeCustomerId");

CREATE INDEX IF NOT EXISTS "business_subscriptions_stripePriceId_idx"
  ON "business_subscriptions"("stripePriceId");

-- Backfill from metadata.stripe JSON (legacy mirror location)
UPDATE "business_subscriptions"
SET
  "stripeCustomerId" = COALESCE(
    "stripeCustomerId",
    NULLIF(metadata #>> '{stripe,customerId}', '')
  ),
  "stripeSubscriptionId" = COALESCE(
    "stripeSubscriptionId",
    NULLIF(metadata #>> '{stripe,subscriptionId}', '')
  ),
  "stripePriceId" = COALESCE(
    "stripePriceId",
    NULLIF(metadata #>> '{stripe,priceId}', '')
  ),
  "cancelAtPeriodEnd" = COALESCE(
    CASE
      WHEN (metadata #>> '{stripe,cancelAtPeriodEnd}') = 'true' THEN true
      WHEN (metadata #>> '{stripe,cancelAtPeriodEnd}') = 'false' THEN false
      ELSE NULL
    END,
    "cancelAtPeriodEnd"
  )
WHERE metadata IS NOT NULL
  AND metadata ? 'stripe';
