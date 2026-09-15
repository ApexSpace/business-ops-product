-- Platform Business Management: Tiers + Add-ons (CEO model)

-- Enums
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

ALTER TYPE "BusinessCapabilitySource" ADD VALUE IF NOT EXISTS 'TIER';
ALTER TYPE "BusinessCapabilitySource" ADD VALUE IF NOT EXISTS 'ADDON';

ALTER TYPE "BusinessSubscriptionEventType" ADD VALUE IF NOT EXISTS 'BLOCKED';
ALTER TYPE "BusinessSubscriptionEventType" ADD VALUE IF NOT EXISTS 'ADDON_PURCHASED';
ALTER TYPE "BusinessSubscriptionEventType" ADD VALUE IF NOT EXISTS 'ADDON_CANCELED';
ALTER TYPE "BusinessSubscriptionEventType" ADD VALUE IF NOT EXISTS 'ADDON_INCLUDED';
ALTER TYPE "BusinessSubscriptionEventType" ADD VALUE IF NOT EXISTS 'TIER_VERSION_MIGRATED';

CREATE TYPE "AddonPurchaseMode" AS ENUM ('INDEPENDENT', 'DEPENDENT');
CREATE TYPE "AddonStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "BusinessAddonStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PENDING');
CREATE TYPE "BusinessAddonSource" AS ENUM ('PURCHASED', 'INCLUDED');
CREATE TYPE "BusinessLocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- Evolve plan_tiers into standalone Tier SKUs
ALTER TABLE "plan_tiers" ALTER COLUMN "planGroupId" DROP NOT NULL;
ALTER TABLE "plan_tiers" ADD COLUMN IF NOT EXISTS "key" TEXT;
ALTER TABLE "plan_tiers" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "plan_tiers" ADD COLUMN IF NOT EXISTS "staffLimit" INTEGER;
ALTER TABLE "plan_tiers" ADD COLUMN IF NOT EXISTS "locationLimit" INTEGER;
ALTER TABLE "plan_tiers" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';

CREATE UNIQUE INDEX IF NOT EXISTS "plan_tiers_key_key" ON "plan_tiers"("key");
CREATE INDEX IF NOT EXISTS "plan_tiers_isPublic_idx" ON "plan_tiers"("isPublic");

-- Drop cascade FK from plan_tiers → plan_groups and recreate as SET NULL
ALTER TABLE "plan_tiers" DROP CONSTRAINT IF EXISTS "plan_tiers_planGroupId_fkey";
ALTER TABLE "plan_tiers"
  ADD CONSTRAINT "plan_tiers_planGroupId_fkey"
  FOREIGN KEY ("planGroupId") REFERENCES "plan_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Tier versions
CREATE TABLE "tier_versions" (
  "id" TEXT NOT NULL,
  "tierId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "priceMonthly" DECIMAL(10,2),
  "priceYearly" DECIMAL(10,2),
  "staffLimit" INTEGER,
  "locationLimit" INTEGER,
  "capabilityIds" JSONB NOT NULL DEFAULT '[]',
  "includedAddonIds" JSONB NOT NULL DEFAULT '[]',
  "dependentAddonIds" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tier_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tier_versions_tierId_version_key" ON "tier_versions"("tierId", "version");
CREATE INDEX "tier_versions_tierId_idx" ON "tier_versions"("tierId");
ALTER TABLE "tier_versions"
  ADD CONSTRAINT "tier_versions_tierId_fkey"
  FOREIGN KEY ("tierId") REFERENCES "plan_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Addons
CREATE TABLE "addons" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "purchaseMode" "AddonPurchaseMode" NOT NULL,
  "status" "AddonStatus" NOT NULL DEFAULT 'DRAFT',
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "priceMonthly" DECIMAL(10,2),
  "priceYearly" DECIMAL(10,2),
  "staffLimitDelta" INTEGER,
  "locationLimitDelta" INTEGER,
  "capabilityId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "addons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "addons_key_key" ON "addons"("key");
CREATE INDEX "addons_status_idx" ON "addons"("status");
CREATE INDEX "addons_purchaseMode_idx" ON "addons"("purchaseMode");
CREATE INDEX "addons_capabilityId_idx" ON "addons"("capabilityId");
ALTER TABLE "addons"
  ADD CONSTRAINT "addons_capabilityId_fkey"
  FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "addon_tier_links" (
  "id" TEXT NOT NULL,
  "addonId" TEXT NOT NULL,
  "tierId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "addon_tier_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "addon_tier_links_addonId_tierId_key" ON "addon_tier_links"("addonId", "tierId");
CREATE INDEX "addon_tier_links_tierId_idx" ON "addon_tier_links"("tierId");
ALTER TABLE "addon_tier_links"
  ADD CONSTRAINT "addon_tier_links_addonId_fkey"
  FOREIGN KEY ("addonId") REFERENCES "addons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "addon_tier_links"
  ADD CONSTRAINT "addon_tier_links_tierId_fkey"
  FOREIGN KEY ("tierId") REFERENCES "plan_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tier_included_addons" (
  "id" TEXT NOT NULL,
  "tierId" TEXT NOT NULL,
  "addonId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tier_included_addons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tier_included_addons_tierId_addonId_key" ON "tier_included_addons"("tierId", "addonId");
CREATE INDEX "tier_included_addons_addonId_idx" ON "tier_included_addons"("addonId");
ALTER TABLE "tier_included_addons"
  ADD CONSTRAINT "tier_included_addons_tierId_fkey"
  FOREIGN KEY ("tierId") REFERENCES "plan_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tier_included_addons"
  ADD CONSTRAINT "tier_included_addons_addonId_fkey"
  FOREIGN KEY ("addonId") REFERENCES "addons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "business_addons" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "addonId" TEXT NOT NULL,
  "status" "BusinessAddonStatus" NOT NULL DEFAULT 'ACTIVE',
  "source" "BusinessAddonSource" NOT NULL,
  "priceAtPurchase" DECIMAL(10,2),
  "billingCycle" "BusinessSubscriptionBillingCycle",
  "stripeSubscriptionItemId" TEXT,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "canceledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_addons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_addons_businessId_addonId_key" ON "business_addons"("businessId", "addonId");
CREATE INDEX "business_addons_businessId_idx" ON "business_addons"("businessId");
CREATE INDEX "business_addons_addonId_idx" ON "business_addons"("addonId");
CREATE INDEX "business_addons_status_idx" ON "business_addons"("status");
CREATE INDEX "business_addons_source_idx" ON "business_addons"("source");
ALTER TABLE "business_addons"
  ADD CONSTRAINT "business_addons_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_addons"
  ADD CONSTRAINT "business_addons_addonId_fkey"
  FOREIGN KEY ("addonId") REFERENCES "addons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "business_locations" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT,
  "zip" TEXT,
  "timezone" TEXT,
  "status" "BusinessLocationStatus" NOT NULL DEFAULT 'ACTIVE',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "defaultCalendarId" TEXT,
  "deactivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "business_locations_businessId_idx" ON "business_locations"("businessId");
CREATE INDEX "business_locations_businessId_status_idx" ON "business_locations"("businessId", "status");
ALTER TABLE "business_locations"
  ADD CONSTRAINT "business_locations_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "business_stripe_customers" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_stripe_customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_stripe_customers_businessId_key" ON "business_stripe_customers"("businessId");
CREATE INDEX "business_stripe_customers_stripeCustomerId_idx" ON "business_stripe_customers"("stripeCustomerId");
ALTER TABLE "business_stripe_customers"
  ADD CONSTRAINT "business_stripe_customers_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "business_payment_methods" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "businessStripeCustomerId" TEXT NOT NULL,
  "stripePaymentMethodId" TEXT NOT NULL,
  "brand" TEXT,
  "last4" TEXT,
  "expMonth" INTEGER,
  "expYear" INTEGER,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_payment_methods_businessId_stripePaymentMethodId_key"
  ON "business_payment_methods"("businessId", "stripePaymentMethodId");
CREATE INDEX "business_payment_methods_businessId_idx" ON "business_payment_methods"("businessId");
CREATE INDEX "business_payment_methods_businessStripeCustomerId_idx"
  ON "business_payment_methods"("businessStripeCustomerId");
ALTER TABLE "business_payment_methods"
  ADD CONSTRAINT "business_payment_methods_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_payment_methods"
  ADD CONSTRAINT "business_payment_methods_businessStripeCustomerId_fkey"
  FOREIGN KEY ("businessStripeCustomerId") REFERENCES "business_stripe_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "business_status_logs" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "fromStatus" "BusinessStatus",
  "toStatus" "BusinessStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "changedByUserId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_status_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "business_status_logs_businessId_idx" ON "business_status_logs"("businessId");
CREATE INDEX "business_status_logs_createdAt_idx" ON "business_status_logs"("createdAt");
ALTER TABLE "business_status_logs"
  ADD CONSTRAINT "business_status_logs_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_status_logs"
  ADD CONSTRAINT "business_status_logs_changedByUserId_fkey"
  FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Subscription purchase snapshot fields
ALTER TABLE "business_subscriptions" ADD COLUMN IF NOT EXISTS "tierVersionId" TEXT;
ALTER TABLE "business_subscriptions" ADD COLUMN IF NOT EXISTS "priceAtPurchase" DECIMAL(10,2);
ALTER TABLE "business_subscriptions" ADD COLUMN IF NOT EXISTS "staffLimitAtPurchase" INTEGER;
ALTER TABLE "business_subscriptions" ADD COLUMN IF NOT EXISTS "locationLimitAtPurchase" INTEGER;
ALTER TABLE "business_subscriptions" ADD COLUMN IF NOT EXISTS "capabilitySnapshot" JSONB;

CREATE INDEX IF NOT EXISTS "business_subscriptions_tierVersionId_idx"
  ON "business_subscriptions"("tierVersionId");
ALTER TABLE "business_subscriptions"
  ADD CONSTRAINT "business_subscriptions_tierVersionId_fkey"
  FOREIGN KEY ("tierVersionId") REFERENCES "tier_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill keys for existing tiers from slug
UPDATE "plan_tiers"
SET "key" = CONCAT('tier_', REPLACE("slug", '-', '_'))
WHERE "key" IS NULL AND "deletedAt" IS NULL;
