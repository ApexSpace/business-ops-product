-- CreateEnum
CREATE TYPE "DataImportEntityType" AS ENUM (
  'CONTACT',
  'SERVICE',
  'PRODUCT',
  'LEAD',
  'NOTE',
  'GIFT_CARD',
  'CLIENT_MEMBERSHIP',
  'CLIENT_PACKAGE',
  'TASK',
  'APPOINTMENT',
  'INVOICE',
  'ESTIMATE',
  'PAYMENT',
  'WORK_ITEM',
  'OFFER',
  'FORM_SUBMISSION',
  'TIME_CARD'
);

-- CreateEnum
CREATE TYPE "DataImportJobStatus" AS ENUM (
  'DRAFT',
  'UPLOADED',
  'MAPPED',
  'VALIDATING',
  'IMPORTING',
  'COMPLETED',
  'COMPLETED_WITH_ERRORS',
  'FAILED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "DataImportDuplicatePolicy" AS ENUM ('SKIP', 'UPDATE', 'CREATE_ALWAYS');

-- CreateTable
CREATE TABLE "data_import_jobs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entityType" "DataImportEntityType" NOT NULL,
    "status" "DataImportJobStatus" NOT NULL DEFAULT 'DRAFT',
    "fileAssetId" TEXT,
    "errorReportAssetId" TEXT,
    "asyncJobId" TEXT,
    "mapping" JSONB,
    "options" JSONB,
    "stats" JSONB,
    "warnings" JSONB,
    "sheetName" TEXT,
    "headerRowNumber" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "data_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_import_jobs_businessId_status_idx" ON "data_import_jobs"("businessId", "status");

-- CreateIndex
CREATE INDEX "data_import_jobs_businessId_entityType_status_idx" ON "data_import_jobs"("businessId", "entityType", "status");

-- CreateIndex
CREATE INDEX "data_import_jobs_businessId_createdAt_idx" ON "data_import_jobs"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_errorReportAssetId_fkey" FOREIGN KEY ("errorReportAssetId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_asyncJobId_fkey" FOREIGN KEY ("asyncJobId") REFERENCES "async_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
