-- CreateEnum
CREATE TYPE "PlanGroupStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlanTierStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlanEmbedTheme" AS ENUM ('LIGHT', 'DARK', 'AUTO');

-- CreateEnum
CREATE TYPE "PlanEmbedLayout" AS ENUM ('CARDS', 'COMPARISON');

-- CreateTable
CREATE TABLE "plan_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PlanGroupStatus" NOT NULL DEFAULT 'DRAFT',
    "billingCycles" JSONB NOT NULL DEFAULT '["MONTHLY","YEARLY"]',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "embedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultCtaLabel" TEXT,
    "defaultCtaUrl" TEXT,
    "metadata" JSONB,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_tiers" (
    "id" TEXT NOT NULL,
    "planGroupId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlanTierStatus" NOT NULL DEFAULT 'DRAFT',
    "priceMonthly" DECIMAL(10,2),
    "priceYearly" DECIMAL(10,2),
    "setupFee" DECIMAL(10,2),
    "trialDays" INTEGER,
    "badge" TEXT,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_tier_capabilities" (
    "id" TEXT NOT NULL,
    "planTierId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_tier_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_feature_rows" (
    "id" TEXT NOT NULL,
    "planGroupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tooltip" TEXT,
    "values" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_feature_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_embed_settings" (
    "id" TEXT NOT NULL,
    "planGroupId" TEXT NOT NULL,
    "theme" "PlanEmbedTheme" NOT NULL DEFAULT 'LIGHT',
    "layout" "PlanEmbedLayout" NOT NULL DEFAULT 'CARDS',
    "showMonthlyYearlyToggle" BOOLEAN NOT NULL DEFAULT true,
    "showFeatureComparison" BOOLEAN NOT NULL DEFAULT true,
    "showSetupFee" BOOLEAN NOT NULL DEFAULT false,
    "showTrialDays" BOOLEAN NOT NULL DEFAULT false,
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_embed_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_groups_slug_key" ON "plan_groups"("slug");

-- CreateIndex
CREATE INDEX "plan_groups_status_idx" ON "plan_groups"("status");

-- CreateIndex
CREATE INDEX "plan_groups_deletedAt_idx" ON "plan_groups"("deletedAt");

-- CreateIndex
CREATE INDEX "plan_tiers_planGroupId_sortOrder_idx" ON "plan_tiers"("planGroupId", "sortOrder");

-- CreateIndex
CREATE INDEX "plan_tiers_status_idx" ON "plan_tiers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "plan_tiers_planGroupId_slug_key" ON "plan_tiers"("planGroupId", "slug");

-- CreateIndex
CREATE INDEX "plan_tier_capabilities_planTierId_sortOrder_idx" ON "plan_tier_capabilities"("planTierId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "plan_tier_capabilities_planTierId_capabilityId_key" ON "plan_tier_capabilities"("planTierId", "capabilityId");

-- CreateIndex
CREATE INDEX "plan_feature_rows_planGroupId_sortOrder_idx" ON "plan_feature_rows"("planGroupId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "plan_embed_settings_planGroupId_key" ON "plan_embed_settings"("planGroupId");

-- AddForeignKey
ALTER TABLE "plan_tiers" ADD CONSTRAINT "plan_tiers_planGroupId_fkey" FOREIGN KEY ("planGroupId") REFERENCES "plan_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_tier_capabilities" ADD CONSTRAINT "plan_tier_capabilities_planTierId_fkey" FOREIGN KEY ("planTierId") REFERENCES "plan_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_tier_capabilities" ADD CONSTRAINT "plan_tier_capabilities_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_feature_rows" ADD CONSTRAINT "plan_feature_rows_planGroupId_fkey" FOREIGN KEY ("planGroupId") REFERENCES "plan_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_embed_settings" ADD CONSTRAINT "plan_embed_settings_planGroupId_fkey" FOREIGN KEY ("planGroupId") REFERENCES "plan_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
