-- CreateEnum
CREATE TYPE "ServiceCommissionType" AS ENUM ('FLAT', 'PERCENT');
CREATE TYPE "ServiceResourceType" AS ENUM ('ROOM', 'EQUIPMENT', 'CONSUMABLE');
CREATE TYPE "ServicePaymentRequirement" AS ENUM ('NO', 'OPTIONAL', 'REQUIRED');

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add new service columns (categoryId nullable during backfill)
ALTER TABLE "services" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "services" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "services" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "services" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "hasProcessingTime" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "processingDurationMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "services" ADD COLUMN "finishDurationMinutes" INTEGER;
ALTER TABLE "services" ADD COLUMN "hasBufferTime" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "services" ADD COLUMN "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "services" ADD COLUMN "usesProducts" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "requiresNoStaff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "requiresTwoStaff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "hasCommissionDeduction" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "commissionDeductionType" "ServiceCommissionType";
ALTER TABLE "services" ADD COLUMN "commissionDeductionValue" DECIMAL(12,2);

-- Backfill categories from distinct service.category per business
INSERT INTO "service_categories" ("id", "businessId", "name", "sortOrder", "status", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    sub."businessId",
    sub.cat_name,
    sub.rn - 1,
    'ACTIVE'::"ServiceStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT
        s."businessId",
        COALESCE(NULLIF(TRIM(s."category"), ''), 'General') AS cat_name,
        ROW_NUMBER() OVER (PARTITION BY s."businessId" ORDER BY COALESCE(NULLIF(TRIM(s."category"), ''), 'General')) AS rn
    FROM "services" s
    WHERE s."deletedAt" IS NULL
) sub;

-- Assign categoryId to services
UPDATE "services" s
SET "categoryId" = sc."id"
FROM "service_categories" sc
WHERE s."businessId" = sc."businessId"
  AND sc."name" = COALESCE(NULLIF(TRIM(s."category"), ''), 'General')
  AND s."deletedAt" IS NULL;

-- Services without category (edge case)
INSERT INTO "service_categories" ("id", "businessId", "name", "sortOrder", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s."businessId", 'General', 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "services" s
WHERE s."categoryId" IS NULL AND s."deletedAt" IS NULL
GROUP BY s."businessId";

UPDATE "services" s
SET "categoryId" = sc."id"
FROM "service_categories" sc
WHERE s."categoryId" IS NULL
  AND s."businessId" = sc."businessId"
  AND sc."name" = 'General'
  AND s."deletedAt" IS NULL;

-- sortOrder from createdAt order within category
WITH ranked AS (
    SELECT s."id", ROW_NUMBER() OVER (PARTITION BY s."categoryId" ORDER BY s."createdAt") - 1 AS so
    FROM "services" s
    WHERE s."deletedAt" IS NULL
)
UPDATE "services" s SET "sortOrder" = r.so FROM ranked r WHERE s."id" = r."id";

ALTER TABLE "services" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "services" DROP COLUMN "category";

-- CreateTable service_staff
CREATE TABLE "service_staff" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "durationMinutes" INTEGER,
    "price" DECIMAL(12,2),
    "hasProcessingTime" BOOLEAN,
    "processingDurationMinutes" INTEGER,
    "finishDurationMinutes" INTEGER,
    "hasBufferTime" BOOLEAN,
    "bufferBeforeMinutes" INTEGER,
    "bufferAfterMinutes" INTEGER,
    "commissionType" "ServiceCommissionType",
    "commissionValue" DECIMAL(12,2),
    "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_staff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_online_booking_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "calendarId" TEXT,
    "customizePriceDisplay" BOOLEAN NOT NULL DEFAULT false,
    "showPromptToCall" BOOLEAN NOT NULL DEFAULT false,
    "requireHomeAddress" BOOLEAN NOT NULL DEFAULT false,
    "requireCreditCard" BOOLEAN NOT NULL DEFAULT false,
    "requirePaymentAtBooking" "ServicePaymentRequirement" NOT NULL DEFAULT 'NO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_online_booking_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_resource_requirements" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "resourceType" "ServiceResourceType" NOT NULL,
    "resourceId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_resource_requirements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_product_usages" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "productId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_product_usages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_option_groups" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_option_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_options" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceAdjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "durationAdjustmentMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_options_pkey" PRIMARY KEY ("id")
);

-- Default online booking settings per service
INSERT INTO "service_online_booking_settings" ("id", "businessId", "serviceId", "onlineBookingEnabled", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s."businessId", s."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "services" s
WHERE s."deletedAt" IS NULL;

-- Indexes and FKs
CREATE INDEX "service_categories_businessId_sortOrder_idx" ON "service_categories"("businessId", "sortOrder");
CREATE INDEX "services_businessId_categoryId_idx" ON "services"("businessId", "categoryId");
CREATE UNIQUE INDEX "service_staff_serviceId_userId_key" ON "service_staff"("serviceId", "userId");
CREATE INDEX "service_staff_businessId_idx" ON "service_staff"("businessId");
CREATE INDEX "service_staff_serviceId_idx" ON "service_staff"("serviceId");
CREATE UNIQUE INDEX "service_online_booking_settings_serviceId_key" ON "service_online_booking_settings"("serviceId");
CREATE INDEX "service_online_booking_settings_businessId_idx" ON "service_online_booking_settings"("businessId");
CREATE INDEX "service_resource_requirements_businessId_serviceId_idx" ON "service_resource_requirements"("businessId", "serviceId");
CREATE INDEX "service_product_usages_businessId_serviceId_idx" ON "service_product_usages"("businessId", "serviceId");
CREATE INDEX "service_option_groups_businessId_serviceId_idx" ON "service_option_groups"("businessId", "serviceId");
CREATE INDEX "service_options_groupId_idx" ON "service_options"("groupId");

ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_online_booking_settings" ADD CONSTRAINT "service_online_booking_settings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_online_booking_settings" ADD CONSTRAINT "service_online_booking_settings_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_resource_requirements" ADD CONSTRAINT "service_resource_requirements_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_resource_requirements" ADD CONSTRAINT "service_resource_requirements_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_product_usages" ADD CONSTRAINT "service_product_usages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_product_usages" ADD CONSTRAINT "service_product_usages_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_option_groups" ADD CONSTRAINT "service_option_groups_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_option_groups" ADD CONSTRAINT "service_option_groups_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_options" ADD CONSTRAINT "service_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "service_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
