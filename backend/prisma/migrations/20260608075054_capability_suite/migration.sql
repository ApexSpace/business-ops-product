-- CreateEnum
CREATE TYPE "CapabilityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "CapabilityModuleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CapabilityFeatureStatus" AS ENUM ('INTERNAL', 'BETA', 'ACTIVE', 'DISABLED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "CapabilityFeatureSource" AS ENUM ('CODE', 'MANUAL');

-- CreateEnum
CREATE TYPE "CapabilityNavigationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "capabilities" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "status" "CapabilityStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_modules" (
    "id" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CapabilityModuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_features" (
    "id" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "moduleId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CapabilityFeatureStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "CapabilityFeatureSource" NOT NULL DEFAULT 'MANUAL',
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "permissionKey" TEXT,
    "limitKey" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_permissions" (
    "id" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "featureId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_limits" (
    "id" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "defaultValue" INTEGER,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_navigation_items" (
    "id" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "moduleId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "icon" TEXT,
    "status" "CapabilityNavigationStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "requiredFeatureKey" TEXT,
    "requiredPermissionKey" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_config_schemas" (
    "id" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "schemaKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schemaJson" JSONB NOT NULL,
    "defaultConfigJson" JSONB,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_config_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capabilities_key_key" ON "capabilities"("key");

-- CreateIndex
CREATE INDEX "capabilities_status_idx" ON "capabilities"("status");

-- CreateIndex
CREATE INDEX "capabilities_sortOrder_idx" ON "capabilities"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "capability_modules_capabilityId_key_key" ON "capability_modules"("capabilityId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "capability_features_key_key" ON "capability_features"("key");

-- CreateIndex
CREATE INDEX "capability_features_capabilityId_idx" ON "capability_features"("capabilityId");

-- CreateIndex
CREATE INDEX "capability_features_moduleId_idx" ON "capability_features"("moduleId");

-- CreateIndex
CREATE INDEX "capability_features_status_idx" ON "capability_features"("status");

-- CreateIndex
CREATE UNIQUE INDEX "capability_permissions_key_key" ON "capability_permissions"("key");

-- CreateIndex
CREATE INDEX "capability_permissions_capabilityId_idx" ON "capability_permissions"("capabilityId");

-- CreateIndex
CREATE INDEX "capability_permissions_featureId_idx" ON "capability_permissions"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "capability_limits_key_key" ON "capability_limits"("key");

-- CreateIndex
CREATE INDEX "capability_limits_capabilityId_idx" ON "capability_limits"("capabilityId");

-- CreateIndex
CREATE INDEX "capability_navigation_items_capabilityId_idx" ON "capability_navigation_items"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "capability_navigation_items_capabilityId_key_key" ON "capability_navigation_items"("capabilityId", "key");

-- CreateIndex
CREATE INDEX "capability_config_schemas_capabilityId_idx" ON "capability_config_schemas"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "capability_config_schemas_capabilityId_schemaKey_key" ON "capability_config_schemas"("capabilityId", "schemaKey");

-- AddForeignKey
ALTER TABLE "capability_modules" ADD CONSTRAINT "capability_modules_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_features" ADD CONSTRAINT "capability_features_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_features" ADD CONSTRAINT "capability_features_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "capability_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_permissions" ADD CONSTRAINT "capability_permissions_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_permissions" ADD CONSTRAINT "capability_permissions_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "capability_features"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_limits" ADD CONSTRAINT "capability_limits_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_navigation_items" ADD CONSTRAINT "capability_navigation_items_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_navigation_items" ADD CONSTRAINT "capability_navigation_items_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "capability_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_config_schemas" ADD CONSTRAINT "capability_config_schemas_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
