-- CreateEnum
CREATE TYPE "IntegrationResourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "IntegrationResourceType" AS ENUM ('CALENDAR', 'GBP_LOCATION', 'FACEBOOK_PAGE', 'INSTAGRAM_ACCOUNT', 'GOOGLE_ADS_ACCOUNT', 'QUICKBOOKS_COMPANY', 'XERO_TENANT', 'EMAIL_ACCOUNT', 'PHONE_NUMBER', 'OTHER');

-- CreateTable
CREATE TABLE "integration_resources" (
    "id" TEXT NOT NULL,
    "businessIntegrationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IntegrationResourceType" NOT NULL,
    "metadata" JSONB,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "IntegrationResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_resources_businessId_providerKey_idx" ON "integration_resources"("businessId", "providerKey");

-- CreateIndex
CREATE INDEX "integration_resources_businessIntegrationId_idx" ON "integration_resources"("businessIntegrationId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_resources_businessIntegrationId_externalId_key" ON "integration_resources"("businessIntegrationId", "externalId");

-- AddForeignKey
ALTER TABLE "integration_resources" ADD CONSTRAINT "integration_resources_businessIntegrationId_fkey" FOREIGN KEY ("businessIntegrationId") REFERENCES "business_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_resources" ADD CONSTRAINT "integration_resources_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
