-- Retire calendar-level public booking fields (moved to BusinessOnlineBookingSettings)

DROP INDEX IF EXISTS "calendars_publicSlug_key";

ALTER TABLE "calendars" DROP COLUMN IF EXISTS "publicSlug";
ALTER TABLE "calendars" DROP COLUMN IF EXISTS "publicBookingEnabled";
