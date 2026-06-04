-- CreateEnum
CREATE TYPE "AsyncJobStatus" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FileAssetStatus" AS ENUM ('PENDING_UPLOAD', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterEnum
ALTER TYPE "MessageStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'RECEIVED';

-- CreateTable
CREATE TABLE "async_jobs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "AsyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "entityType" TEXT,
    "entityId" TEXT,
    "bullJobId" TEXT,
    "idempotencyKey" TEXT,
    "result" JSONB,
    "errorMessage" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "async_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "storageProvider" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "FileAssetStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "async_jobs_businessId_status_idx" ON "async_jobs"("businessId", "status");

-- CreateIndex
CREATE INDEX "async_jobs_businessId_createdAt_idx" ON "async_jobs"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "async_jobs_businessId_idempotencyKey_key" ON "async_jobs"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "file_assets_businessId_idx" ON "file_assets"("businessId");

-- CreateIndex
CREATE INDEX "file_assets_businessId_entityType_entityId_idx" ON "file_assets"("businessId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "file_assets_businessId_status_idx" ON "file_assets"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_bucket_key_key" ON "file_assets"("bucket", "key");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_externalEventId_key" ON "webhook_events"("provider", "externalEventId");

-- AddForeignKey
ALTER TABLE "async_jobs" ADD CONSTRAINT "async_jobs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "async_jobs" ADD CONSTRAINT "async_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostgreSQL search extensions (Sprint 1)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS contacts_name_trgm_idx ON contacts USING gin ((COALESCE("firstName", '') || ' ' || COALESCE("lastName", '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_email_trgm_idx ON contacts USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS conversations_preview_trgm_idx ON conversations USING gin ("lastMessagePreview" gin_trgm_ops);
