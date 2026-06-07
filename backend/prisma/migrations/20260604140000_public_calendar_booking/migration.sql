-- AlterEnum
ALTER TYPE "AppointmentSource" ADD VALUE 'PUBLIC_LINK';

-- AlterTable
ALTER TABLE "calendars" ADD COLUMN "publicSlug" TEXT,
ADD COLUMN "publicBookingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "embedEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "calendars_publicSlug_key" ON "calendars"("publicSlug");
