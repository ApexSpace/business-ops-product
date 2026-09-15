-- AlterTable
ALTER TABLE "client_packages" ADD COLUMN "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "client_packages_invoiceId_idx" ON "client_packages"("invoiceId");

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
