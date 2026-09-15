-- CreateEnum
CREATE TYPE "AppointmentAutomatedMessageEventType" AS ENUM ('BOOKED', 'CANCELED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "AppointmentAutomatedMessageTriggerKind" AS ENUM ('IMMEDIATE', 'BEFORE_START');

-- CreateEnum
CREATE TYPE "AppointmentAutomatedMessageOffsetUnit" AS ENUM ('DAYS', 'HOURS');

-- CreateEnum
CREATE TYPE "AppointmentAutomatedMessageSourceScope" AS ENUM ('ALL', 'ONLINE', 'STAFF');

-- CreateTable
CREATE TABLE "business_appointment_automated_message_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "eventType" "AppointmentAutomatedMessageEventType" NOT NULL,
    "defaultStatus" "AppointmentStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_appointment_automated_message_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_automated_message_triggers" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "kind" "AppointmentAutomatedMessageTriggerKind" NOT NULL,
    "offsetValue" INTEGER,
    "offsetUnit" "AppointmentAutomatedMessageOffsetUnit",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_automated_message_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_automated_messages" (
    "id" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "sourceScope" "AppointmentAutomatedMessageSourceScope" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_automated_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_appointment_automated_message_settings_businessId_idx" ON "business_appointment_automated_message_settings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_appointment_automated_message_settings_businessId_eventType_key" ON "business_appointment_automated_message_settings"("businessId", "eventType");

-- CreateIndex
CREATE INDEX "appointment_automated_message_triggers_settingsId_idx" ON "appointment_automated_message_triggers"("settingsId");

-- CreateIndex
CREATE INDEX "appointment_automated_messages_triggerId_idx" ON "appointment_automated_messages"("triggerId");

-- AddForeignKey
ALTER TABLE "business_appointment_automated_message_settings" ADD CONSTRAINT "business_appointment_automated_message_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_automated_message_triggers" ADD CONSTRAINT "appointment_automated_message_triggers_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "business_appointment_automated_message_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_automated_messages" ADD CONSTRAINT "appointment_automated_messages_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "appointment_automated_message_triggers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
