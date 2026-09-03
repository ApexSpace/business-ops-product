-- CreateEnum
CREATE TYPE "SelfCancellationMode" AS ENUM ('DISABLED', 'WITHIN_MINUTES_OF_ONLINE_BOOKING', 'UNTIL_HOURS_BEFORE_APPOINTMENT');

-- CreateEnum
CREATE TYPE "SelfRescheduleMode" AS ENUM ('DISABLED', 'UNTIL_HOURS_BEFORE_APPOINTMENT');

-- CreateTable
CREATE TABLE "business_cancel_reschedule_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cancellationPolicyHtml" TEXT,
    "cancellationPolicySms" VARCHAR(215),
    "requirePolicyAgreement" BOOLEAN NOT NULL DEFAULT false,
    "selfCancellationMode" "SelfCancellationMode" NOT NULL DEFAULT 'DISABLED',
    "selfCancellationMinutes" INTEGER NOT NULL DEFAULT 15,
    "selfCancellationHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "selfRescheduleMode" "SelfRescheduleMode" NOT NULL DEFAULT 'DISABLED',
    "selfRescheduleHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "lateCancellationHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_cancel_reschedule_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "clientManageToken" TEXT,
ADD COLUMN "bookedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "business_cancel_reschedule_settings_businessId_key" ON "business_cancel_reschedule_settings"("businessId");

-- CreateIndex
CREATE INDEX "business_cancel_reschedule_settings_businessId_idx" ON "business_cancel_reschedule_settings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_clientManageToken_key" ON "appointments"("clientManageToken");

-- AddForeignKey
ALTER TABLE "business_cancel_reschedule_settings" ADD CONSTRAINT "business_cancel_reschedule_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill manage tokens for active future appointments
UPDATE "appointments"
SET "clientManageToken" = gen_random_uuid()::text
WHERE "deletedAt" IS NULL
  AND "clientManageToken" IS NULL
  AND "status" NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW');

-- Backfill bookedAt from createdAt for online booking sources
UPDATE "appointments"
SET "bookedAt" = "createdAt"
WHERE "bookedAt" IS NULL
  AND "source" IN ('BOOKING_WIDGET', 'PUBLIC_LINK');
