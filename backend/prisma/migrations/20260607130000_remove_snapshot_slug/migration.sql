-- DropIndex
DROP INDEX IF EXISTS "snapshots_slug_key";

-- AlterTable
ALTER TABLE "snapshots" DROP COLUMN "slug";
