-- CreateEnum
CREATE TYPE "AnyoneAssignmentMode" AS ENUM ('RANDOM', 'ORDER');

-- CreateEnum
CREATE TYPE "BookingWaitlistStatus" AS ENUM ('PENDING', 'NOTIFIED', 'BOOKED', 'CANCELLED');

-- AlterTable
ALTER TABLE "business_memberships" ADD COLUMN "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "calendarId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "business_online_booking_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "publicSlug" TEXT,
    "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "minimumNoticeMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxBookingDays" INTEGER NOT NULL DEFAULT 60,
    "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locationType" "CalendarLocationType" NOT NULL DEFAULT 'PHYSICAL',
    "locationValue" TEXT,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "autoConfirm" BOOLEAN NOT NULL DEFAULT true,
    "avoidGapsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "allowMultipleServices" BOOLEAN NOT NULL DEFAULT false,
    "allowDuplicateServices" BOOLEAN NOT NULL DEFAULT false,
    "singleStaffOnly" BOOLEAN NOT NULL DEFAULT false,
    "collectPhotosEnabled" BOOLEAN NOT NULL DEFAULT false,
    "photoUploadPrompt" TEXT,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "randomizeStaffOrder" BOOLEAN NOT NULL DEFAULT false,
    "showGenderOptions" BOOLEAN NOT NULL DEFAULT false,
    "showAnyoneOption" BOOLEAN NOT NULL DEFAULT true,
    "anyoneAssignmentMode" "AnyoneAssignmentMode" NOT NULL DEFAULT 'RANDOM',
    "anyoneExcludedStaffIds" JSONB,
    "embedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "overlayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "formSettings" JSONB,
    "confirmationSettings" JSONB,
    "widgetSettings" JSONB,
    "notificationSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_online_booking_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hours" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hour_exceptions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isUnavailable" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_hour_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_work_schedules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_work_exceptions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isUnavailable" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_work_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_waitlist_entries" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "staffId" TEXT,
    "preferredDate" DATE NOT NULL,
    "status" "BookingWaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_online_booking_settings_businessId_key" ON "business_online_booking_settings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_online_booking_settings_publicSlug_key" ON "business_online_booking_settings"("publicSlug");

-- CreateIndex
CREATE INDEX "business_online_booking_settings_businessId_idx" ON "business_online_booking_settings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_hours_businessId_dayOfWeek_key" ON "business_hours"("businessId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "business_hours_businessId_idx" ON "business_hours"("businessId");

-- CreateIndex
CREATE INDEX "business_hour_exceptions_businessId_idx" ON "business_hour_exceptions"("businessId");

-- CreateIndex
CREATE INDEX "business_hour_exceptions_businessId_date_idx" ON "business_hour_exceptions"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "staff_work_schedules_businessId_userId_dayOfWeek_key" ON "staff_work_schedules"("businessId", "userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "staff_work_schedules_businessId_idx" ON "staff_work_schedules"("businessId");

-- CreateIndex
CREATE INDEX "staff_work_schedules_businessId_userId_idx" ON "staff_work_schedules"("businessId", "userId");

-- CreateIndex
CREATE INDEX "staff_work_exceptions_businessId_idx" ON "staff_work_exceptions"("businessId");

-- CreateIndex
CREATE INDEX "staff_work_exceptions_businessId_userId_date_idx" ON "staff_work_exceptions"("businessId", "userId", "date");

-- CreateIndex
CREATE INDEX "booking_waitlist_entries_businessId_idx" ON "booking_waitlist_entries"("businessId");

-- CreateIndex
CREATE INDEX "booking_waitlist_entries_businessId_serviceId_idx" ON "booking_waitlist_entries"("businessId", "serviceId");

-- CreateIndex
CREATE INDEX "booking_waitlist_entries_businessId_preferredDate_idx" ON "booking_waitlist_entries"("businessId", "preferredDate");

-- AddForeignKey
ALTER TABLE "business_online_booking_settings" ADD CONSTRAINT "business_online_booking_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hour_exceptions" ADD CONSTRAINT "business_hour_exceptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_work_schedules" ADD CONSTRAINT "staff_work_schedules_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_work_schedules" ADD CONSTRAINT "staff_work_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_work_exceptions" ADD CONSTRAINT "staff_work_exceptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_work_exceptions" ADD CONSTRAINT "staff_work_exceptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_waitlist_entries" ADD CONSTRAINT "booking_waitlist_entries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_waitlist_entries" ADD CONSTRAINT "booking_waitlist_entries_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_waitlist_entries" ADD CONSTRAINT "booking_waitlist_entries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_waitlist_entries" ADD CONSTRAINT "booking_waitlist_entries_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate calendar public slugs to business online booking settings
INSERT INTO "business_online_booking_settings" (
    "id",
    "businessId",
    "publicSlug",
    "onlineBookingEnabled",
    "minimumNoticeMinutes",
    "maxBookingDays",
    "slotIntervalMinutes",
    "bufferBeforeMinutes",
    "bufferAfterMinutes",
    "timezone",
    "locationType",
    "locationValue",
    "requireApproval",
    "autoConfirm",
    "embedEnabled",
    "formSettings",
    "confirmationSettings",
    "widgetSettings",
    "notificationSettings",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    c."businessId",
    c."publicSlug",
    c."publicBookingEnabled",
    c."minimumNoticeMinutes",
    c."maxBookingDays",
    c."slotIntervalMinutes",
    c."bufferBeforeMinutes",
    c."bufferAfterMinutes",
    c."timezone",
    c."locationType",
    c."locationValue",
    c."requireApproval",
    c."autoConfirm",
    c."embedEnabled",
    c."formSettings",
    c."confirmationSettings",
    c."widgetSettings",
    c."notificationSettings",
    NOW()
FROM "calendars" c
WHERE c."publicSlug" IS NOT NULL
  AND c."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "business_online_booking_settings" b
    WHERE b."businessId" = c."businessId"
  )
ON CONFLICT DO NOTHING;

-- Migrate calendar availability to business hours (first calendar per business)
INSERT INTO "business_hours" (
    "id",
    "businessId",
    "dayOfWeek",
    "startTime",
    "endTime",
    "isEnabled",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    ca."businessId",
    ca."dayOfWeek",
    ca."startTime",
    ca."endTime",
    ca."isEnabled",
    NOW()
FROM "calendar_availability" ca
INNER JOIN (
    SELECT DISTINCT ON ("businessId") "id", "businessId"
    FROM "calendars"
    WHERE "deletedAt" IS NULL
    ORDER BY "businessId", "createdAt" ASC
) first_cal ON first_cal."id" = ca."calendarId"
WHERE NOT EXISTS (
    SELECT 1 FROM "business_hours" bh
    WHERE bh."businessId" = ca."businessId"
      AND bh."dayOfWeek" = ca."dayOfWeek"
);

-- Migrate calendar exceptions to business hour exceptions
INSERT INTO "business_hour_exceptions" (
    "id",
    "businessId",
    "date",
    "startTime",
    "endTime",
    "isUnavailable",
    "reason",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    ce."businessId",
    ce."date",
    ce."startTime",
    ce."endTime",
    ce."isUnavailable",
    ce."reason",
    NOW()
FROM "calendar_exceptions" ce
INNER JOIN (
    SELECT DISTINCT ON ("businessId") "id", "businessId"
    FROM "calendars"
    WHERE "deletedAt" IS NULL
    ORDER BY "businessId", "createdAt" ASC
) first_cal ON first_cal."id" = ce."calendarId"
WHERE NOT EXISTS (
    SELECT 1 FROM "business_hour_exceptions" bhe
    WHERE bhe."businessId" = ce."businessId"
      AND bhe."date" = ce."date"
);
