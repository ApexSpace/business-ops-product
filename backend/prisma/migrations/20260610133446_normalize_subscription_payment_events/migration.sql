/*
  Warnings:

  - You are about to drop the column `planTierIdAfter` on the `business_subscription_events` table. All the data in the column will be lost.
  - You are about to drop the column `planTierIdBefore` on the `business_subscription_events` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BusinessSubscriptionPaymentSource" AS ENUM ('ADMIN', 'SYSTEM', 'PUBLIC_SIGNUP', 'WEBHOOK', 'IMPORT');

-- DropIndex
DROP INDEX "business_subscription_events_planTierIdAfter_idx";

-- DropIndex
DROP INDEX "business_subscription_events_planTierIdBefore_idx";

-- AlterTable
ALTER TABLE "business_subscription_events" DROP COLUMN "planTierIdAfter",
DROP COLUMN "planTierIdBefore";

-- AlterTable
ALTER TABLE "business_subscription_payments" ADD COLUMN     "source" "BusinessSubscriptionPaymentSource" NOT NULL DEFAULT 'ADMIN';
