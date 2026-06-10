-- CreateEnum
CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('STRIPE', 'BANK_TRANSFER', 'WISE', 'PAYPAL', 'CASH', 'JAZZCASH', 'EASYPAISA', 'MANUAL_INVOICE', 'FREE_INTERNAL', 'NOT_SELECTED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "BusinessCapabilitySource" AS ENUM ('PLAN_TIER', 'CUSTOM', 'MANUAL');

-- CreateEnum
CREATE TYPE "BusinessCapabilityAssignmentStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterEnum
ALTER TYPE "BusinessStatus" ADD VALUE 'NOT_ACTIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'INTERNAL';

-- DropForeignKey
ALTER TABLE "business_subscriptions" DROP CONSTRAINT "business_subscriptions_planId_fkey";

-- AlterTable
ALTER TABLE "business_subscriptions" ADD COLUMN     "amount" DECIMAL(10,2),
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentMethod" "SubscriptionPaymentMethod" NOT NULL DEFAULT 'NOT_SELECTED',
ADD COLUMN     "paymentStatus" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "planGroupId" TEXT,
ADD COLUMN     "planTierId" TEXT,
ADD COLUMN     "trialEnd" TIMESTAMP(3),
ADD COLUMN     "trialStart" TIMESTAMP(3),
ALTER COLUMN "planId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "business_capabilities" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "source" "BusinessCapabilitySource" NOT NULL,
    "status" "BusinessCapabilityAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_capabilities_businessId_idx" ON "business_capabilities"("businessId");

-- CreateIndex
CREATE INDEX "business_capabilities_capabilityId_idx" ON "business_capabilities"("capabilityId");

-- CreateIndex
CREATE INDEX "business_capabilities_source_idx" ON "business_capabilities"("source");

-- CreateIndex
CREATE UNIQUE INDEX "business_capabilities_businessId_capabilityId_key" ON "business_capabilities"("businessId", "capabilityId");

-- CreateIndex
CREATE INDEX "business_subscriptions_planGroupId_idx" ON "business_subscriptions"("planGroupId");

-- CreateIndex
CREATE INDEX "business_subscriptions_planTierId_idx" ON "business_subscriptions"("planTierId");

-- CreateIndex
CREATE INDEX "business_subscriptions_paymentStatus_idx" ON "business_subscriptions"("paymentStatus");

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_planGroupId_fkey" FOREIGN KEY ("planGroupId") REFERENCES "plan_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_planTierId_fkey" FOREIGN KEY ("planTierId") REFERENCES "plan_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_capabilities" ADD CONSTRAINT "business_capabilities_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_capabilities" ADD CONSTRAINT "business_capabilities_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
