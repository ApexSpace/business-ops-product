-- AlterTable
ALTER TABLE "plan_groups" ADD COLUMN     "designSettings" JSONB;

-- AlterTable
ALTER TABLE "plan_tiers" ADD COLUMN     "designSettings" JSONB;
