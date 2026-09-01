-- CreateEnum
CREATE TYPE "CalendarZoomLevel" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateTable
CREATE TABLE "business_calendar_display_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "visibleStartTime" TEXT NOT NULL DEFAULT '00:00',
    "visibleEndTime" TEXT NOT NULL DEFAULT '24:00',
    "weekStartsOn" "DayOfWeek" NOT NULL DEFAULT 'SUNDAY',
    "zoomLevel" "CalendarZoomLevel" NOT NULL DEFAULT 'MEDIUM',
    "showNormalCancellation" BOOLEAN NOT NULL DEFAULT true,
    "showLateCancellation" BOOLEAN NOT NULL DEFAULT true,
    "showNoShow" BOOLEAN NOT NULL DEFAULT true,
    "highContrastEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_calendar_display_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_calendar_display_settings_businessId_key" ON "business_calendar_display_settings"("businessId");

-- CreateIndex
CREATE INDEX "business_calendar_display_settings_businessId_idx" ON "business_calendar_display_settings"("businessId");

-- AddForeignKey
ALTER TABLE "business_calendar_display_settings" ADD CONSTRAINT "business_calendar_display_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
