-- CreateEnum
CREATE TYPE "BusinessLifecycleStage" AS ENUM ('LEAD', 'CONTACTED', 'TRIAL', 'ACTIVE', 'CHURNED');

-- AlterTable businesses: existing rows become ACTIVE customers
ALTER TABLE "businesses"
  ADD COLUMN "lifecycleStage" "BusinessLifecycleStage" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "lifecyclePipelineId" TEXT,
  ADD COLUMN "lifecyclePipelineStageId" TEXT;

-- AlterTable pipeline_stages: optional mapping for ops campaign stages
ALTER TABLE "pipeline_stages"
  ADD COLUMN "mapsToLifecycleStage" "BusinessLifecycleStage";

-- CreateIndex
CREATE INDEX "businesses_lifecycleStage_idx" ON "businesses"("lifecycleStage");
CREATE INDEX "businesses_lifecyclePipelineId_lifecyclePipelineStageId_idx"
  ON "businesses"("lifecyclePipelineId", "lifecyclePipelineStageId");

-- AddForeignKey
ALTER TABLE "businesses"
  ADD CONSTRAINT "businesses_lifecyclePipelineId_fkey"
  FOREIGN KEY ("lifecyclePipelineId") REFERENCES "pipelines"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "businesses"
  ADD CONSTRAINT "businesses_lifecyclePipelineStageId_fkey"
  FOREIGN KEY ("lifecyclePipelineStageId") REFERENCES "pipeline_stages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Ops pipelines feature grants (idempotent)
INSERT INTO "business_feature_grants" (
  "id", "businessId", "featureKey", "source", "status", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, '00000000-0000-4000-8000-000000000001', v."featureKey", 'MANUAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('pipelines.list'),
  ('pipelines.create'),
  ('pipelines.edit'),
  ('pipelines.delete')
) AS v("featureKey")
WHERE NOT EXISTS (
  SELECT 1
  FROM "business_feature_grants" g
  WHERE g."businessId" = '00000000-0000-4000-8000-000000000001'
    AND g."featureKey" = v."featureKey"
    AND g."status" = 'ACTIVE'
);
