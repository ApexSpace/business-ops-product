-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "serviceId" TEXT,
    "leadId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "status" "WorkItemStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "amount" DECIMAL(12,2),
    "assignedToId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_items_businessId_idx" ON "work_items"("businessId");
CREATE INDEX "work_items_businessId_contactId_idx" ON "work_items"("businessId", "contactId");
CREATE INDEX "work_items_businessId_serviceId_idx" ON "work_items"("businessId", "serviceId");
CREATE INDEX "work_items_businessId_status_idx" ON "work_items"("businessId", "status");
CREATE INDEX "work_items_businessId_assignedToId_idx" ON "work_items"("businessId", "assignedToId");
CREATE INDEX "work_items_businessId_scheduledAt_idx" ON "work_items"("businessId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
