-- AlterEnum
ALTER TYPE "WebhookEventProvider" ADD VALUE 'TWILIO';

-- CreateTable
CREATE TABLE "platform_sms_suppressions" (
    "id" TEXT NOT NULL,
    "platformFromNumber" TEXT NOT NULL,
    "customerPhoneE164" TEXT NOT NULL,
    "businessId" TEXT,
    "optedOutAt" TIMESTAMP(3),
    "optedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_sms_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_sms_suppressions_from_phone_key" ON "platform_sms_suppressions"("platformFromNumber", "customerPhoneE164");

-- CreateIndex
CREATE INDEX "platform_sms_suppressions_businessId_idx" ON "platform_sms_suppressions"("businessId");

-- CreateIndex
CREATE INDEX "platform_sms_suppressions_platformFromNumber_idx" ON "platform_sms_suppressions"("platformFromNumber");

-- AddForeignKey
ALTER TABLE "platform_sms_suppressions" ADD CONSTRAINT "platform_sms_suppressions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
