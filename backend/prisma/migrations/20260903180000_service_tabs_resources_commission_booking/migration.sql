-- Dual commission (post), online booking fields, resource group requirements
-- IDs in this project are TEXT (Prisma String), not Postgres UUID.

DO $$ BEGIN
  CREATE TYPE "ServicePriceDisplayMode" AS ENUM ('SHOW_MINIMUM', 'HIDE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ServiceResourceSelectionMode" AS ENUM ('ALL', 'SPECIFIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "services"
  ADD COLUMN IF NOT EXISTS "postCommissionDeductionType" "ServiceCommissionType",
  ADD COLUMN IF NOT EXISTS "postCommissionDeductionValue" DECIMAL(12,2);

ALTER TABLE "service_online_booking_settings"
  ADD COLUMN IF NOT EXISTS "priceDisplayMode" "ServicePriceDisplayMode",
  ADD COLUMN IF NOT EXISTS "promptToCallExplanation" TEXT,
  ADD COLUMN IF NOT EXISTS "onlineBookingDescription" TEXT;

-- Soften legacy requirement columns, add group model
ALTER TABLE "service_resource_requirements"
  ALTER COLUMN "label" DROP NOT NULL,
  ALTER COLUMN "resourceType" DROP NOT NULL;

ALTER TABLE "service_resource_requirements"
  ADD COLUMN IF NOT EXISTS "groupId" TEXT,
  ADD COLUMN IF NOT EXISTS "selectionMode" "ServiceResourceSelectionMode" NOT NULL DEFAULT 'ALL';

CREATE TABLE IF NOT EXISTS "service_resource_requirement_items" (
  "id" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_resource_requirement_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_resource_requirement_items_requirementId_resourceId_key"
  ON "service_resource_requirement_items"("requirementId", "resourceId");

CREATE INDEX IF NOT EXISTS "service_resource_requirement_items_resourceId_idx"
  ON "service_resource_requirement_items"("resourceId");

CREATE INDEX IF NOT EXISTS "service_resource_requirements_businessId_groupId_idx"
  ON "service_resource_requirements"("businessId", "groupId");

-- Backfill: infer group from linked resource; SPECIFIC + item when resourceId set
UPDATE "service_resource_requirements" req
SET
  "groupId" = r."groupId",
  "selectionMode" = CASE WHEN req."resourceId" IS NOT NULL THEN 'SPECIFIC'::"ServiceResourceSelectionMode" ELSE 'ALL'::"ServiceResourceSelectionMode" END
FROM "resources" r
WHERE req."resourceId" = r."id"
  AND req."groupId" IS NULL;

INSERT INTO "service_resource_requirement_items" ("id", "requirementId", "resourceId", "createdAt")
SELECT gen_random_uuid()::text, req."id", req."resourceId", CURRENT_TIMESTAMP
FROM "service_resource_requirements" req
WHERE req."resourceId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "service_resource_requirement_items" i
    WHERE i."requirementId" = req."id" AND i."resourceId" = req."resourceId"
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_resource_requirements_groupId_fkey'
  ) THEN
    ALTER TABLE "service_resource_requirements"
      ADD CONSTRAINT "service_resource_requirements_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "resource_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_resource_requirement_items_requirementId_fkey'
  ) THEN
    ALTER TABLE "service_resource_requirement_items"
      ADD CONSTRAINT "service_resource_requirement_items_requirementId_fkey"
      FOREIGN KEY ("requirementId") REFERENCES "service_resource_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_resource_requirement_items_resourceId_fkey'
  ) THEN
    ALTER TABLE "service_resource_requirement_items"
      ADD CONSTRAINT "service_resource_requirement_items_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
