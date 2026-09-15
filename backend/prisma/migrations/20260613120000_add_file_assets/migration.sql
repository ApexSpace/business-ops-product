-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('IMAGE', 'PDF', 'DOCUMENT', 'VIDEO', 'AUDIO', 'OTHER');

-- AlterEnum
ALTER TYPE "FileVisibility" ADD VALUE IF NOT EXISTS 'SIGNED';

-- AlterEnum
ALTER TYPE "FileAssetStatus" RENAME VALUE 'PENDING_UPLOAD' TO 'PENDING';

-- DropForeignKey
ALTER TABLE "file_assets" DROP CONSTRAINT IF EXISTS "file_assets_ownerId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "file_assets_businessId_entityType_entityId_idx";
DROP INDEX IF EXISTS "file_assets_businessId_status_idx";
DROP INDEX IF EXISTS "file_assets_bucket_key_key";

-- DropTable
DROP TABLE "file_assets";

-- CreateTable
CREATE TABLE "file_assets" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "originalName" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" "FileCategory" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "status" "FileAssetStatus" NOT NULL DEFAULT 'PENDING',
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_objectKey_key" ON "file_assets"("objectKey");

-- CreateIndex
CREATE INDEX "file_assets_businessId_idx" ON "file_assets"("businessId");

-- CreateIndex
CREATE INDEX "file_assets_uploadedById_idx" ON "file_assets"("uploadedById");

-- CreateIndex
CREATE INDEX "file_assets_businessId_category_idx" ON "file_assets"("businessId", "category");

-- CreateIndex
CREATE INDEX "file_assets_status_idx" ON "file_assets"("status");

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
