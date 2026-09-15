-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CHECK';

-- CreateTable
CREATE TABLE "business_checkout_advanced_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customPaymentMethodNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tipButtonPercents" INTEGER[] DEFAULT ARRAY[18, 20, 22],
    "hideTipButtons" BOOLEAN NOT NULL DEFAULT false,
    "askClientsForTip" BOOLEAN NOT NULL DEFAULT true,
    "askForTipProductsOnly" BOOLEAN NOT NULL DEFAULT false,
    "askClientsForSignature" BOOLEAN NOT NULL DEFAULT false,
    "enableCheckPayments" BOOLEAN NOT NULL DEFAULT false,
    "showChangeCalculator" BOOLEAN NOT NULL DEFAULT false,
    "showReceiptPreview" BOOLEAN NOT NULL DEFAULT false,
    "requireStaffForServices" BOOLEAN NOT NULL DEFAULT false,
    "requireStaffForProducts" BOOLEAN NOT NULL DEFAULT false,
    "requireStaffForGiftCards" BOOLEAN NOT NULL DEFAULT false,
    "requireStaffForPackages" BOOLEAN NOT NULL DEFAULT false,
    "showServiceProviderOnReceipt" BOOLEAN NOT NULL DEFAULT true,
    "receiptCustomFooterText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_checkout_advanced_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_checkout_advanced_settings_businessId_key" ON "business_checkout_advanced_settings"("businessId");

-- AddForeignKey
ALTER TABLE "business_checkout_advanced_settings" ADD CONSTRAINT "business_checkout_advanced_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
