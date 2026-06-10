-- CreateTable
CREATE TABLE "plan_tier_features" (
    "id" TEXT NOT NULL,
    "planTierId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_tier_features_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "plan_embed_settings" ADD COLUMN "showCapabilities" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "plan_embed_settings" ADD COLUMN "showTierFeatures" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "plan_tier_features_planTierId_sortOrder_idx" ON "plan_tier_features"("planTierId", "sortOrder");

-- AddForeignKey
ALTER TABLE "plan_tier_features" ADD CONSTRAINT "plan_tier_features_planTierId_fkey" FOREIGN KEY ("planTierId") REFERENCES "plan_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
