-- CreateEnum
CREATE TYPE "SubscriptionBillingSource" AS ENUM ('STRIPE', 'MANUAL', 'INTERNAL');

-- AlterTable
ALTER TABLE "business_subscriptions" ADD COLUMN "billingSource" "SubscriptionBillingSource" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "business_subscriptions_billingSource_idx" ON "business_subscriptions"("billingSource");
