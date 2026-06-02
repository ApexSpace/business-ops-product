-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'ERROR', 'DISABLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('COMMUNICATION', 'CALENDAR', 'REPUTATION', 'PAYMENTS', 'SOCIAL_MEDIA', 'ACCOUNTING', 'AI', 'STORAGE', 'ADS', 'OTHER');

-- CreateTable
CREATE TABLE "integration_providers" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "IntegrationCategory" NOT NULL,
    "logoUrl" TEXT,
    "isPlatformLevel" BOOLEAN NOT NULL DEFAULT false,
    "isBusinessLevel" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_integrations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "config" JSONB,
    "credentials" JSONB,
    "connectedAccountName" TEXT,
    "connectedAccountEmail" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_integrations" (
    "id" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "config" JSONB,
    "credentials" JSONB,
    "connectedAccountName" TEXT,
    "connectedAccountEmail" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_providers_key_key" ON "integration_providers"("key");

-- CreateIndex
CREATE INDEX "business_integrations_businessId_idx" ON "business_integrations"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_integrations_businessId_providerKey_key" ON "business_integrations"("businessId", "providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "platform_integrations_providerKey_key" ON "platform_integrations"("providerKey");

-- AddForeignKey
ALTER TABLE "business_integrations" ADD CONSTRAINT "business_integrations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_integrations" ADD CONSTRAINT "business_integrations_providerKey_fkey" FOREIGN KEY ("providerKey") REFERENCES "integration_providers"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_integrations" ADD CONSTRAINT "platform_integrations_providerKey_fkey" FOREIGN KEY ("providerKey") REFERENCES "integration_providers"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
