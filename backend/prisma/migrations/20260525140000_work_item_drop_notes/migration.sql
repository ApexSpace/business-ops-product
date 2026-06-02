-- Work items: use description only; remove redundant notes column
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "notes";
