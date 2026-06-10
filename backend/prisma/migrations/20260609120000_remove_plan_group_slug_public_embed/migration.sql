-- DropIndex
DROP INDEX "plan_groups_slug_key";

-- AlterTable
ALTER TABLE "plan_groups" DROP COLUMN "slug",
DROP COLUMN "isPublic",
DROP COLUMN "embedEnabled";
