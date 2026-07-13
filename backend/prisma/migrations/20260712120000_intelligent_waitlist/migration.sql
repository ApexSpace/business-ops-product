-- Rename waitlist status values to match intelligent waitlist lifecycle
ALTER TYPE "BookingWaitlistStatus" RENAME VALUE 'PENDING' TO 'WAITING';
ALTER TYPE "BookingWaitlistStatus" RENAME VALUE 'NOTIFIED' TO 'MATCHED';
ALTER TYPE "BookingWaitlistStatus" ADD VALUE IF NOT EXISTS 'DISMISSED';
ALTER TYPE "BookingWaitlistStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- CreateEnum
CREATE TYPE "BookingWaitlistSource" AS ENUM ('ONLINE_BOOKING', 'STAFF_MANUAL');

-- AlterTable business_memberships
ALTER TABLE "business_memberships" ADD COLUMN "canManageWaitlist" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable booking_waitlist_entries
ALTER TABLE "booking_waitlist_entries" ADD COLUMN "calendarId" TEXT;
ALTER TABLE "booking_waitlist_entries" ADD COLUMN "preferredMorning" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "booking_waitlist_entries" ADD COLUMN "preferredAfternoon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "booking_waitlist_entries" ADD COLUMN "preferredEvening" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "booking_waitlist_entries" ADD COLUMN "comments" TEXT;
ALTER TABLE "booking_waitlist_entries" ADD COLUMN "source" "BookingWaitlistSource" NOT NULL DEFAULT 'ONLINE_BOOKING';

ALTER TABLE "booking_waitlist_entries" ALTER COLUMN "status" SET DEFAULT 'WAITING';

-- CreateIndex
CREATE INDEX "booking_waitlist_entries_businessId_status_idx" ON "booking_waitlist_entries"("businessId", "status");
CREATE INDEX "booking_waitlist_entries_businessId_staffId_idx" ON "booking_waitlist_entries"("businessId", "staffId");
CREATE INDEX "booking_waitlist_entries_businessId_calendarId_idx" ON "booking_waitlist_entries"("businessId", "calendarId");

-- AddForeignKey
ALTER TABLE "booking_waitlist_entries" ADD CONSTRAINT "booking_waitlist_entries_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
