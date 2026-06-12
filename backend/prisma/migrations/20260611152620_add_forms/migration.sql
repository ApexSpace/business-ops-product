-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "forms" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "publicKey" TEXT NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "forms_publicKey_key" ON "forms"("publicKey");

-- CreateIndex
CREATE INDEX "forms_businessId_idx" ON "forms"("businessId");

-- CreateIndex
CREATE INDEX "forms_businessId_status_idx" ON "forms"("businessId", "status");

-- CreateIndex
CREATE INDEX "forms_businessId_deletedAt_idx" ON "forms"("businessId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "forms_businessId_slug_key" ON "forms"("businessId", "slug");

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
