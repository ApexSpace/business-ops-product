-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "resource_groups" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "groupId" TEXT,
    "name" TEXT NOT NULL,
    "resourceType" "ServiceResourceType" NOT NULL,
    "description" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_availability" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_schedule_exceptions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isUnavailable" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_option_resource_requirements" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceOptionId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_option_resource_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_resource_assignments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_resource_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_groups_businessId_sortOrder_idx" ON "resource_groups"("businessId", "sortOrder");

-- CreateIndex
CREATE INDEX "resources_businessId_groupId_idx" ON "resources"("businessId", "groupId");

-- CreateIndex
CREATE INDEX "resources_businessId_resourceType_idx" ON "resources"("businessId", "resourceType");

-- CreateIndex
CREATE INDEX "resources_businessId_name_idx" ON "resources"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "resource_availability_resourceId_dayOfWeek_key" ON "resource_availability"("resourceId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "resource_availability_businessId_idx" ON "resource_availability"("businessId");

-- CreateIndex
CREATE INDEX "resource_schedule_exceptions_businessId_idx" ON "resource_schedule_exceptions"("businessId");

-- CreateIndex
CREATE INDEX "resource_schedule_exceptions_resourceId_date_idx" ON "resource_schedule_exceptions"("resourceId", "date");

-- CreateIndex
CREATE INDEX "service_option_resource_requirements_businessId_serviceOptionI_idx" ON "service_option_resource_requirements"("businessId", "serviceOptionId");

-- CreateIndex
CREATE INDEX "service_option_resource_requirements_businessId_resourceId_idx" ON "service_option_resource_requirements"("businessId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_resource_assignments_appointmentId_resourceId_key" ON "appointment_resource_assignments"("appointmentId", "resourceId");

-- CreateIndex
CREATE INDEX "appointment_resource_assignments_businessId_idx" ON "appointment_resource_assignments"("businessId");

-- CreateIndex
CREATE INDEX "service_resource_requirements_businessId_resourceId_idx" ON "service_resource_requirements"("businessId", "resourceId");

-- AddForeignKey
ALTER TABLE "resource_groups" ADD CONSTRAINT "resource_groups_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "resource_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_availability" ADD CONSTRAINT "resource_availability_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_availability" ADD CONSTRAINT "resource_availability_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_schedule_exceptions" ADD CONSTRAINT "resource_schedule_exceptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_schedule_exceptions" ADD CONSTRAINT "resource_schedule_exceptions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_option_resource_requirements" ADD CONSTRAINT "service_option_resource_requirements_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_option_resource_requirements" ADD CONSTRAINT "service_option_resource_requirements_serviceOptionId_fkey" FOREIGN KEY ("serviceOptionId") REFERENCES "service_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_option_resource_requirements" ADD CONSTRAINT "service_option_resource_requirements_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_resource_assignments" ADD CONSTRAINT "appointment_resource_assignments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_resource_assignments" ADD CONSTRAINT "appointment_resource_assignments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_resource_assignments" ADD CONSTRAINT "appointment_resource_assignments_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_resource_requirements" ADD CONSTRAINT "service_resource_requirements_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
