-- AlterEnum
ALTER TYPE "WebhookEventProvider" ADD VALUE 'RESEND';

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('RESEND');

-- CreateEnum
CREATE TYPE "EmailMessageStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED');

-- CreateTable
CREATE TABLE "business_email_preferences" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_email_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "contactId" TEXT,
    "userId" TEXT,
    "emailType" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "replyTo" TEXT,
    "subject" TEXT NOT NULL,
    "status" "EmailMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" "EmailProvider" NOT NULL DEFAULT 'RESEND',
    "providerMessageId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_email_preferences_businessId_idx" ON "business_email_preferences"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_email_preferences_businessId_emailType_key" ON "business_email_preferences"("businessId", "emailType");

-- CreateIndex
CREATE INDEX "email_templates_businessId_idx" ON "email_templates"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_businessId_emailType_key" ON "email_templates"("businessId", "emailType");

-- CreateIndex
CREATE INDEX "email_messages_businessId_idx" ON "email_messages"("businessId");

-- CreateIndex
CREATE INDEX "email_messages_status_idx" ON "email_messages"("status");

-- CreateIndex
CREATE INDEX "email_messages_createdAt_idx" ON "email_messages"("createdAt");

-- CreateIndex
CREATE INDEX "email_messages_providerMessageId_idx" ON "email_messages"("providerMessageId");

-- CreateIndex
CREATE INDEX "email_messages_businessId_createdAt_idx" ON "email_messages"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "business_email_preferences" ADD CONSTRAINT "business_email_preferences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
