-- CreateEnum
CREATE TYPE "PackageExpirationPolicy" AS ENUM ('NEVER', 'AFTER_PURCHASE');

-- CreateEnum
CREATE TYPE "PackageCommissionBasis" AS ENUM ('REGULAR_PRICE', 'DISCOUNTED_PRICE');

-- CreateEnum
CREATE TYPE "PackageServiceGroupQuantityType" AS ENUM ('ONE', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "ClientPackageSource" AS ENUM ('STAFF', 'ONLINE');

-- CreateEnum
CREATE TYPE "ClientPackageStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DEPLETED', 'TRANSFERRED', 'DELETED');

-- CreateEnum
CREATE TYPE "PackageHistoryEventType" AS ENUM ('PURCHASED', 'REDEEMED', 'ADJUSTED', 'TRANSFERRED_IN', 'TRANSFERRED_OUT', 'EXPIRED', 'DELETED');

-- CreateTable
CREATE TABLE "package_templates" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "chargeTax" BOOLEAN NOT NULL DEFAULT false,
    "expirationPolicy" "PackageExpirationPolicy" NOT NULL DEFAULT 'NEVER',
    "expirationDays" INTEGER,
    "onlineSalesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shortDescription" TEXT,
    "description" TEXT,
    "requireAgreement" BOOLEAN NOT NULL DEFAULT false,
    "agreementText" TEXT,
    "commissionBasis" "PackageCommissionBasis" NOT NULL DEFAULT 'REGULAR_PRICE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_service_groups" (
    "id" TEXT NOT NULL,
    "packageTemplateId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityType" "PackageServiceGroupQuantityType" NOT NULL DEFAULT 'ONE',
    "groupPrice" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "package_service_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_service_group_items" (
    "id" TEXT NOT NULL,
    "serviceGroupId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "package_service_group_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_packages" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "packageTemplateId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "source" "ClientPackageSource" NOT NULL DEFAULT 'STAFF',
    "stripePaymentIntentId" TEXT,
    "status" "ClientPackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_service_allocations" (
    "id" TEXT NOT NULL,
    "clientPackageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "remaining" INTEGER NOT NULL,
    "initialQty" INTEGER NOT NULL,

    CONSTRAINT "package_service_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_history_events" (
    "id" TEXT NOT NULL,
    "clientPackageId" TEXT NOT NULL,
    "eventType" "PackageHistoryEventType" NOT NULL,
    "description" TEXT,
    "staffUserId" TEXT,
    "quantityChange" INTEGER,
    "serviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_history_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "publicSlug" TEXT,
    "onlineSalesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "package_templates_businessId_idx" ON "package_templates"("businessId");

-- CreateIndex
CREATE INDEX "package_service_groups_packageTemplateId_idx" ON "package_service_groups"("packageTemplateId");

-- CreateIndex
CREATE INDEX "package_service_group_items_serviceGroupId_idx" ON "package_service_group_items"("serviceGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "package_service_group_items_serviceGroupId_serviceId_key" ON "package_service_group_items"("serviceGroupId", "serviceId");

-- CreateIndex
CREATE INDEX "client_packages_businessId_idx" ON "client_packages"("businessId");

-- CreateIndex
CREATE INDEX "client_packages_contactId_idx" ON "client_packages"("contactId");

-- CreateIndex
CREATE INDEX "client_packages_packageTemplateId_idx" ON "client_packages"("packageTemplateId");

-- CreateIndex
CREATE INDEX "client_packages_businessId_status_idx" ON "client_packages"("businessId", "status");

-- CreateIndex
CREATE INDEX "package_service_allocations_clientPackageId_idx" ON "package_service_allocations"("clientPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "package_service_allocations_clientPackageId_serviceId_key" ON "package_service_allocations"("clientPackageId", "serviceId");

-- CreateIndex
CREATE INDEX "package_history_events_clientPackageId_idx" ON "package_history_events"("clientPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "package_settings_businessId_key" ON "package_settings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "package_settings_publicSlug_key" ON "package_settings"("publicSlug");

-- AddForeignKey
ALTER TABLE "package_templates" ADD CONSTRAINT "package_templates_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_service_groups" ADD CONSTRAINT "package_service_groups_packageTemplateId_fkey" FOREIGN KEY ("packageTemplateId") REFERENCES "package_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_service_group_items" ADD CONSTRAINT "package_service_group_items_serviceGroupId_fkey" FOREIGN KEY ("serviceGroupId") REFERENCES "package_service_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_service_group_items" ADD CONSTRAINT "package_service_group_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_packageTemplateId_fkey" FOREIGN KEY ("packageTemplateId") REFERENCES "package_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_service_allocations" ADD CONSTRAINT "package_service_allocations_clientPackageId_fkey" FOREIGN KEY ("clientPackageId") REFERENCES "client_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_service_allocations" ADD CONSTRAINT "package_service_allocations_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_history_events" ADD CONSTRAINT "package_history_events_clientPackageId_fkey" FOREIGN KEY ("clientPackageId") REFERENCES "client_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_settings" ADD CONSTRAINT "package_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
