-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('STANDARD', 'CHECKOUT');

-- CreateEnum
CREATE TYPE "InvoiceLineType" AS ENUM ('SERVICE', 'PRODUCT', 'ACCOUNT_BALANCE_DEPOSIT', 'GIFT_CARD', 'PACKAGE', 'OFFER', 'CUSTOM');

-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'OPEN';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "kind" "InvoiceKind" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "invoices" ADD COLUMN "displaySequence" INTEGER;
ALTER TABLE "invoices" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN "closedById" TEXT;

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN "lineType" "InvoiceLineType" NOT NULL DEFAULT 'SERVICE';
ALTER TABLE "invoice_items" ADD COLUMN "staffUserId" TEXT;
ALTER TABLE "invoice_items" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invoice_items" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "invoices_businessId_kind_idx" ON "invoices"("businessId", "kind");
CREATE INDEX "invoices_businessId_kind_status_idx" ON "invoices"("businessId", "kind", "status");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
