-- CreateEnum
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED', 'IN_APPEAL', 'PENDING_DELETION', 'DELETED', 'LIMIT_EXCEEDED');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION');

-- CreateTable
CREATE TABLE "whatsapp_message_templates" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" "WhatsAppTemplateCategory" NOT NULL,
    "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'PENDING',
    "parameterFormat" TEXT NOT NULL DEFAULT 'POSITIONAL',
    "metaTemplateId" TEXT,
    "components" JSONB NOT NULL,
    "bodyPreview" TEXT,
    "rejectionReason" TEXT,
    "qualityScore" JSONB,
    "submittedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_templates_businessId_name_language_key" ON "whatsapp_message_templates"("businessId", "name", "language");

-- CreateIndex
CREATE INDEX "whatsapp_message_templates_businessId_status_idx" ON "whatsapp_message_templates"("businessId", "status");

-- AddForeignKey
ALTER TABLE "whatsapp_message_templates" ADD CONSTRAINT "whatsapp_message_templates_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_templates" ADD CONSTRAINT "whatsapp_message_templates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
