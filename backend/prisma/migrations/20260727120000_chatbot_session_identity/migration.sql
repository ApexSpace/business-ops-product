-- CreateEnum
CREATE TYPE "ChatbotSessionIdentityType" AS ENUM ('ANONYMOUS', 'ANONYMOUS_WITH_PROFILE', 'AUTHENTICATED');

-- CreateEnum
CREATE TYPE "ChatbotIdentityRefType" AS ENUM ('CONTACT', 'PLATFORM_CUSTOMER');

-- AlterTable
ALTER TABLE "chatbot_sessions"
  ADD COLUMN "identityType" "ChatbotSessionIdentityType" NOT NULL DEFAULT 'ANONYMOUS',
  ADD COLUMN "identityRefId" TEXT,
  ADD COLUMN "identityRefType" "ChatbotIdentityRefType";

-- Backfill: sessions that already have a captured name/email become ANONYMOUS_WITH_PROFILE
UPDATE "chatbot_sessions"
SET "identityType" = 'ANONYMOUS_WITH_PROFILE'
WHERE "identityType" = 'ANONYMOUS'
  AND (
    (NULLIF(TRIM("visitorName"), '') IS NOT NULL)
    OR (NULLIF(TRIM("visitorEmail"), '') IS NOT NULL)
  );

-- CreateIndex
CREATE INDEX "chatbot_sessions_chatbotId_visitorId_idx" ON "chatbot_sessions"("chatbotId", "visitorId");
CREATE INDEX "chatbot_sessions_identityRefType_identityRefId_idx" ON "chatbot_sessions"("identityRefType", "identityRefId");
CREATE INDEX "chatbot_sessions_chatbotId_identityRefId_idx" ON "chatbot_sessions"("chatbotId", "identityRefId");

-- Ops chatbots feature grants (idempotent)
INSERT INTO "business_feature_grants" (
  "id", "businessId", "featureKey", "source", "status", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, '00000000-0000-4000-8000-000000000001', v."featureKey", 'MANUAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('chatbots.list'),
  ('chatbots.create'),
  ('chatbots.edit'),
  ('chatbots.delete')
) AS v("featureKey")
WHERE NOT EXISTS (
  SELECT 1
  FROM "business_feature_grants" g
  WHERE g."businessId" = '00000000-0000-4000-8000-000000000001'
    AND g."featureKey" = v."featureKey"
    AND g."status" = 'ACTIVE'
);
