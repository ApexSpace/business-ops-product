-- CreateEnum
CREATE TYPE "BusinessNiche" AS ENUM ('GENERIC', 'MED_SPA', 'HVAC');

-- CreateEnum
CREATE TYPE "PipelineStageType" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('ACTIVE', 'WON', 'LOST', 'ARCHIVED');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "niche" "BusinessNiche" NOT NULL DEFAULT 'GENERIC';

-- CreateTable
CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "PipelineStageType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "pipelineId" TEXT NOT NULL,
    "pipelineStageId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "title" TEXT,
    "value" DECIMAL(12,2),
    "status" "LeadStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipelines_businessId_idx" ON "pipelines"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "pipelines_businessId_name_key" ON "pipelines"("businessId", "name");

-- CreateIndex
CREATE INDEX "pipeline_stages_businessId_idx" ON "pipeline_stages"("businessId");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipelineId_idx" ON "pipeline_stages"("pipelineId");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_pipelineId_position_key" ON "pipeline_stages"("pipelineId", "position");

-- CreateIndex
CREATE INDEX "leads_businessId_idx" ON "leads"("businessId");

-- CreateIndex
CREATE INDEX "leads_businessId_pipelineId_idx" ON "leads"("businessId", "pipelineId");

-- CreateIndex
CREATE INDEX "leads_businessId_pipelineStageId_idx" ON "leads"("businessId", "pipelineStageId");

-- CreateIndex
CREATE INDEX "leads_businessId_assignedToId_idx" ON "leads"("businessId", "assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_businessId_contactId_key" ON "leads"("businessId", "contactId");

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
