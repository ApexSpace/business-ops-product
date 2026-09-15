-- CreateEnum
CREATE TYPE "EntitlementChangeCampaignType" AS ENUM ('TIER_PRICE', 'TIER_CAPABILITY', 'CAPABILITY_FEATURE', 'ADDON_PACKAGING');

-- CreateEnum
CREATE TYPE "EntitlementChangeCampaignStatus" AS ENUM ('OPEN', 'NOTIFIED', 'DUE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EntitlementChangeCampaignPolicy" AS ENUM ('KEEP_GRANDFATHERED', 'FORCE_REMOVE', 'CONVERT_TO_PURCHASED', 'APPLY_NEW_PRICE');

-- CreateEnum
CREATE TYPE "EntitlementChangeCampaignMemberStatus" AS ENUM ('PENDING', 'NOTIFIED', 'EXTENDED', 'MIGRATED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "BusinessFeatureGrantSource" AS ENUM ('GRANDFATHERED', 'MANUAL');

-- CreateEnum
CREATE TYPE "BusinessFeatureGrantStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "business_feature_grants" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "source" "BusinessFeatureGrantSource" NOT NULL DEFAULT 'GRANDFATHERED',
    "status" "BusinessFeatureGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "capabilityId" TEXT,
    "campaignId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_feature_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_change_campaigns" (
    "id" TEXT NOT NULL,
    "type" "EntitlementChangeCampaignType" NOT NULL,
    "status" "EntitlementChangeCampaignStatus" NOT NULL DEFAULT 'OPEN',
    "policy" "EntitlementChangeCampaignPolicy" NOT NULL DEFAULT 'KEEP_GRANDFATHERED',
    "summary" TEXT NOT NULL,
    "message" TEXT,
    "tierId" TEXT,
    "addonId" TEXT,
    "capabilityId" TEXT,
    "featureKeys" JSONB NOT NULL DEFAULT '[]',
    "fromVersionId" TEXT,
    "toVersionId" TEXT,
    "payload" JSONB,
    "effectiveAt" TIMESTAMP(3),
    "autoForce" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlement_change_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_change_campaign_members" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "status" "EntitlementChangeCampaignMemberStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "migratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlement_change_campaign_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_feature_grants_businessId_idx" ON "business_feature_grants"("businessId");

-- CreateIndex
CREATE INDEX "business_feature_grants_featureKey_idx" ON "business_feature_grants"("featureKey");

-- CreateIndex
CREATE INDEX "business_feature_grants_status_idx" ON "business_feature_grants"("status");

-- CreateIndex
CREATE INDEX "business_feature_grants_campaignId_idx" ON "business_feature_grants"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "business_feature_grants_businessId_featureKey_source_key" ON "business_feature_grants"("businessId", "featureKey", "source");

-- CreateIndex
CREATE INDEX "entitlement_change_campaigns_type_idx" ON "entitlement_change_campaigns"("type");

-- CreateIndex
CREATE INDEX "entitlement_change_campaigns_status_idx" ON "entitlement_change_campaigns"("status");

-- CreateIndex
CREATE INDEX "entitlement_change_campaigns_tierId_idx" ON "entitlement_change_campaigns"("tierId");

-- CreateIndex
CREATE INDEX "entitlement_change_campaigns_addonId_idx" ON "entitlement_change_campaigns"("addonId");

-- CreateIndex
CREATE INDEX "entitlement_change_campaigns_capabilityId_idx" ON "entitlement_change_campaigns"("capabilityId");

-- CreateIndex
CREATE INDEX "entitlement_change_campaigns_effectiveAt_idx" ON "entitlement_change_campaigns"("effectiveAt");

-- CreateIndex
CREATE INDEX "entitlement_change_campaigns_createdAt_idx" ON "entitlement_change_campaigns"("createdAt");

-- CreateIndex
CREATE INDEX "entitlement_change_campaign_members_campaignId_idx" ON "entitlement_change_campaign_members"("campaignId");

-- CreateIndex
CREATE INDEX "entitlement_change_campaign_members_businessId_idx" ON "entitlement_change_campaign_members"("businessId");

-- CreateIndex
CREATE INDEX "entitlement_change_campaign_members_status_idx" ON "entitlement_change_campaign_members"("status");

-- CreateIndex
CREATE INDEX "entitlement_change_campaign_members_effectiveAt_idx" ON "entitlement_change_campaign_members"("effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_change_campaign_members_campaignId_businessId_key" ON "entitlement_change_campaign_members"("campaignId", "businessId");

-- AddForeignKey
ALTER TABLE "business_feature_grants" ADD CONSTRAINT "business_feature_grants_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_feature_grants" ADD CONSTRAINT "business_feature_grants_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "entitlement_change_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_change_campaigns" ADD CONSTRAINT "entitlement_change_campaigns_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "plan_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_change_campaigns" ADD CONSTRAINT "entitlement_change_campaigns_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "addons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_change_campaigns" ADD CONSTRAINT "entitlement_change_campaigns_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_change_campaigns" ADD CONSTRAINT "entitlement_change_campaigns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_change_campaign_members" ADD CONSTRAINT "entitlement_change_campaign_members_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "entitlement_change_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_change_campaign_members" ADD CONSTRAINT "entitlement_change_campaign_members_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
