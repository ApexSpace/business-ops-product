-- CreateTable
CREATE TABLE "social_comments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "socialPostTargetId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "externalCommentId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "parentExternalCommentId" TEXT,
    "authorName" TEXT,
    "authorExternalId" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "externalCreatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_comments_providerKey_externalCommentId_key" ON "social_comments"("providerKey", "externalCommentId");

-- CreateIndex
CREATE INDEX "social_comments_businessId_isRead_idx" ON "social_comments"("businessId", "isRead");

-- CreateIndex
CREATE INDEX "social_comments_businessId_deletedAt_idx" ON "social_comments"("businessId", "deletedAt");

-- CreateIndex
CREATE INDEX "social_comments_socialPostTargetId_externalCreatedAt_idx" ON "social_comments"("socialPostTargetId", "externalCreatedAt");

-- CreateIndex
CREATE INDEX "social_comments_parentCommentId_idx" ON "social_comments"("parentCommentId");

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_socialPostTargetId_fkey" FOREIGN KEY ("socialPostTargetId") REFERENCES "social_post_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "social_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
