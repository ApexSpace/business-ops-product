-- AlterTable
ALTER TABLE "business_calendar_display_settings" ADD COLUMN "showBufferOnCalendar" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "business_scheduling_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "bufferTimeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "processingTimeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rebookingJumpWeeks" JSONB NOT NULL DEFAULT '[2,3,4,5,6,7]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_scheduling_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_scheduling_settings_businessId_key" ON "business_scheduling_settings"("businessId");

-- CreateIndex
CREATE INDEX "business_scheduling_settings_businessId_idx" ON "business_scheduling_settings"("businessId");

-- AddForeignKey
ALTER TABLE "business_scheduling_settings" ADD CONSTRAINT "business_scheduling_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
