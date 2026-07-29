-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING_COMPLETION';
ALTER TYPE "AppointmentSource" ADD VALUE 'EXPRESS';

-- AlterTable BusinessOnlineBookingSettings
ALTER TABLE "business_online_booking_settings" ADD COLUMN "expressBookingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_online_booking_settings" ADD COLUMN "expressBookingAutoEnable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_online_booking_settings" ADD COLUMN "expressBookingTimeLimitMinutes" INTEGER NOT NULL DEFAULT 30;

-- AlterTable appointments
ALTER TABLE "appointments" ADD COLUMN "guestFirstName" TEXT;
ALTER TABLE "appointments" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "appointments" ADD COLUMN "guestPhone" TEXT;
ALTER TABLE "appointments" ADD COLUMN "guestPhoneCountryCode" TEXT;
ALTER TABLE "appointments" ADD COLUMN "expressBookingToken" TEXT;
ALTER TABLE "appointments" ADD COLUMN "expressBookingExpiresAt" TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN "expressBookingCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_expressBookingToken_key" ON "appointments"("expressBookingToken");
CREATE INDEX "appointments_businessId_status_expressBookingExpiresAt_idx" ON "appointments"("businessId", "status", "expressBookingExpiresAt");
