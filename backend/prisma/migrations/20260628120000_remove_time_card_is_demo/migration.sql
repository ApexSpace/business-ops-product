-- Remove demo flag from time cards (production data only).

ALTER TABLE "time_cards" DROP COLUMN IF EXISTS "isDemo";
