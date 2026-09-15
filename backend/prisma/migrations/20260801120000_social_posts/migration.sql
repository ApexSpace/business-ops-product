-- AlterEnum
ALTER TYPE "IntegrationResourceType" ADD VALUE IF NOT EXISTS 'LINKEDIN_ORGANIZATION';
ALTER TYPE "IntegrationResourceType" ADD VALUE IF NOT EXISTS 'YOUTUBE_CHANNEL';
ALTER TYPE "IntegrationResourceType" ADD VALUE IF NOT EXISTS 'TIKTOK_USER';
ALTER TYPE "IntegrationResourceType" ADD VALUE IF NOT EXISTS 'PINTEREST_BOARD';
ALTER TYPE "IntegrationResourceType" ADD VALUE IF NOT EXISTS 'X_USER';

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'PARTIAL',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "SocialPostTargetStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "caption" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3),
    "timezone" TEXT,
    "publishedAt" TIMESTAMP(3),
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_post_targets" (
    "id" TEXT NOT NULL,
    "socialPostId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "integrationResourceId" TEXT,
    "postType" TEXT NOT NULL DEFAULT 'FEED',
    "platformPayload" JSONB NOT NULL DEFAULT '{}',
    "status" "SocialPostTargetStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "externalPostId" TEXT,
    "permalink" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "bullJobId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_post_media" (
    "id" TEXT NOT NULL,
    "socialPostId" TEXT NOT NULL,
    "socialPostTargetId" TEXT,
    "fileAssetId" TEXT NOT NULL,
    "thumbnailFileAssetId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,

    CONSTRAINT "social_post_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_post_metrics" (
    "id" TEXT NOT NULL,
    "socialPostTargetId" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "rawJson" JSONB,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_posts_businessId_status_idx" ON "social_posts"("businessId", "status");
CREATE INDEX "social_posts_businessId_scheduledAt_idx" ON "social_posts"("businessId", "scheduledAt");
CREATE INDEX "social_posts_businessId_deletedAt_idx" ON "social_posts"("businessId", "deletedAt");
CREATE INDEX "social_post_targets_socialPostId_status_idx" ON "social_post_targets"("socialPostId", "status");
CREATE INDEX "social_post_targets_status_scheduledAt_idx" ON "social_post_targets"("status", "scheduledAt");
CREATE INDEX "social_post_targets_providerKey_status_idx" ON "social_post_targets"("providerKey", "status");
CREATE INDEX "social_post_targets_externalPostId_idx" ON "social_post_targets"("externalPostId");
CREATE INDEX "social_post_media_socialPostId_sortOrder_idx" ON "social_post_media"("socialPostId", "sortOrder");
CREATE UNIQUE INDEX "social_post_metrics_socialPostTargetId_key" ON "social_post_metrics"("socialPostTargetId");

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "social_post_targets" ADD CONSTRAINT "social_post_targets_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_post_targets" ADD CONSTRAINT "social_post_targets_integrationResourceId_fkey" FOREIGN KEY ("integrationResourceId") REFERENCES "integration_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "social_post_media" ADD CONSTRAINT "social_post_media_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_post_media" ADD CONSTRAINT "social_post_media_socialPostTargetId_fkey" FOREIGN KEY ("socialPostTargetId") REFERENCES "social_post_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "social_post_media" ADD CONSTRAINT "social_post_media_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_post_media" ADD CONSTRAINT "social_post_media_thumbnailFileAssetId_fkey" FOREIGN KEY ("thumbnailFileAssetId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "social_post_metrics" ADD CONSTRAINT "social_post_metrics_socialPostTargetId_fkey" FOREIGN KEY ("socialPostTargetId") REFERENCES "social_post_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
