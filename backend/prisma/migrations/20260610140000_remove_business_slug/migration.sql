-- DropIndex
DROP INDEX IF EXISTS "businesses_slug_key";

-- AlterTable
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "slug";
