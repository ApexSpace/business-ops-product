-- CreateEnum
CREATE TYPE "ExpressDepositType" AS ENUM ('FULL', 'PERCENTAGE', 'FIXED');

-- AlterTable business_online_booking_settings
ALTER TABLE "business_online_booking_settings" ADD COLUMN "expressRequireCard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_online_booking_settings" ADD COLUMN "expressRequireDeposit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_online_booking_settings" ADD COLUMN "expressDepositType" "ExpressDepositType" NOT NULL DEFAULT 'FULL';
ALTER TABLE "business_online_booking_settings" ADD COLUMN "expressAllowPhotoUpload" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_online_booking_settings" ADD COLUMN "cancellationPolicyVersion" TEXT NOT NULL DEFAULT '1';

-- AlterTable appointments
ALTER TABLE "appointments" ADD COLUMN "expressRequireCard" BOOLEAN;
ALTER TABLE "appointments" ADD COLUMN "expressRequireDeposit" BOOLEAN;
ALTER TABLE "appointments" ADD COLUMN "expressTimeLimitMinutes" INTEGER;

-- CreateTable
CREATE TABLE "cancellation_policy_acceptances" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellation_policy_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_policy_acceptances_appointmentId_key" ON "cancellation_policy_acceptances"("appointmentId");
CREATE INDEX "cancellation_policy_acceptances_businessId_idx" ON "cancellation_policy_acceptances"("businessId");

-- AddForeignKey
ALTER TABLE "cancellation_policy_acceptances" ADD CONSTRAINT "cancellation_policy_acceptances_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cancellation_policy_acceptances" ADD CONSTRAINT "cancellation_policy_acceptances_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
