-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "defaultChatbotId" TEXT;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_defaultChatbotId_fkey" FOREIGN KEY ("defaultChatbotId") REFERENCES "chatbots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: prefer ACTIVE chatbots, then oldest by createdAt
UPDATE "businesses" AS b
SET "defaultChatbotId" = sub."id"
FROM (
  SELECT DISTINCT ON (c."businessId")
    c."businessId",
    c."id"
  FROM "chatbots" AS c
  WHERE c."deletedAt" IS NULL
  ORDER BY
    c."businessId",
    CASE WHEN c."status" = 'ACTIVE' THEN 0 ELSE 1 END,
    c."createdAt" ASC
) AS sub
WHERE b."id" = sub."businessId"
  AND b."defaultChatbotId" IS NULL;
