-- CreateEnum
CREATE TYPE "GapTimeBlockMode" AS ENUM ('IGNORE', 'SAME_AS_APPOINTMENTS');

-- CreateEnum
CREATE TYPE "GapEmptyDayMode" AS ENUM ('ALL_TIMES', 'SHIFT_EDGES_ONLY');

-- CreateEnum
CREATE TYPE "GapMultiProviderMode" AS ENUM ('SAME_AS_SINGLE', 'ALLOW_GAPS');

-- AlterTable
ALTER TABLE "business_online_booking_settings"
ADD COLUMN "avoidGapsMaxGapMinutes" INTEGER,
ADD COLUMN "avoidGapsMinGapMinutes" INTEGER,
ADD COLUMN "avoidGapsTimeBlockMode" "GapTimeBlockMode" NOT NULL DEFAULT 'SAME_AS_APPOINTMENTS',
ADD COLUMN "avoidGapsEmptyDayMode" "GapEmptyDayMode" NOT NULL DEFAULT 'ALL_TIMES',
ADD COLUMN "avoidGapsMultiProviderMode" "GapMultiProviderMode" NOT NULL DEFAULT 'SAME_AS_SINGLE';

UPDATE "business_online_booking_settings"
SET "avoidGapsMaxGapMinutes" = 0
WHERE "avoidGapsEnabled" = true AND "avoidGapsMaxGapMinutes" IS NULL;
