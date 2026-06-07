-- CreateEnum
CREATE TYPE "ChatbotStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChatbotWidgetPosition" AS ENUM ('BOTTOM_RIGHT', 'BOTTOM_LEFT');

-- CreateEnum
CREATE TYPE "ChatbotRuleTriggerType" AS ENUM ('EXACT_MATCH', 'CONTAINS', 'STARTS_WITH', 'FALLBACK');

-- CreateEnum
CREATE TYPE "ChatbotSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'CONVERTED');

-- CreateTable
CREATE TABLE "chatbots" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ChatbotStatus" NOT NULL DEFAULT 'DRAFT',
    "publicKey" TEXT NOT NULL,
    "description" TEXT,
    "appearanceSettings" JSONB NOT NULL DEFAULT '{}',
    "chatWindowSettings" JSONB NOT NULL DEFAULT '{}',
    "messagingSettings" JSONB NOT NULL DEFAULT '{}',
    "businessHoursSettings" JSONB NOT NULL DEFAULT '{}',
    "formSettings" JSONB NOT NULL DEFAULT '{}',
    "botSettings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "chatbots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_rules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "triggerType" "ChatbotRuleTriggerType" NOT NULL,
    "triggerText" TEXT NOT NULL,
    "responseText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_sessions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "conversationId" TEXT,
    "contactId" TEXT,
    "visitorId" TEXT NOT NULL,
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "visitorPhone" TEXT,
    "pageUrl" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "status" "ChatbotSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "chatbot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chatbots_publicKey_key" ON "chatbots"("publicKey");

-- CreateIndex
CREATE INDEX "chatbots_businessId_idx" ON "chatbots"("businessId");

-- CreateIndex
CREATE INDEX "chatbots_businessId_status_idx" ON "chatbots"("businessId", "status");

-- CreateIndex
CREATE INDEX "chatbot_rules_businessId_idx" ON "chatbot_rules"("businessId");

-- CreateIndex
CREATE INDEX "chatbot_rules_chatbotId_idx" ON "chatbot_rules"("chatbotId");

-- CreateIndex
CREATE INDEX "chatbot_rules_chatbotId_sortOrder_idx" ON "chatbot_rules"("chatbotId", "sortOrder");

-- CreateIndex
CREATE INDEX "chatbot_sessions_businessId_idx" ON "chatbot_sessions"("businessId");

-- CreateIndex
CREATE INDEX "chatbot_sessions_chatbotId_idx" ON "chatbot_sessions"("chatbotId");

-- CreateIndex
CREATE INDEX "chatbot_sessions_visitorId_idx" ON "chatbot_sessions"("visitorId");

-- CreateIndex
CREATE INDEX "chatbot_sessions_conversationId_idx" ON "chatbot_sessions"("conversationId");

-- CreateIndex
CREATE INDEX "chatbot_sessions_contactId_idx" ON "chatbot_sessions"("contactId");

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_rules" ADD CONSTRAINT "chatbot_rules_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_rules" ADD CONSTRAINT "chatbot_rules_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
