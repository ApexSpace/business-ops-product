-- AlterTable
ALTER TABLE "estimates" ADD COLUMN     "termsAndConditions" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "termsAndConditions" TEXT;
