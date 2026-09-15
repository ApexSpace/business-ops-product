-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateTable
CREATE TABLE "business_notification_channel_preferences" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_notification_channel_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_notification_channel_preferences_businessId_idx" ON "business_notification_channel_preferences"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "bncp_business_notification_key" ON "business_notification_channel_preferences"("businessId", "notificationKey");

-- AddForeignKey
ALTER TABLE "business_notification_channel_preferences" ADD CONSTRAINT "business_notification_channel_preferences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
