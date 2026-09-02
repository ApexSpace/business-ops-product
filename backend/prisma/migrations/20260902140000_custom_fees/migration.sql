-- CreateEnum
CREATE TYPE "CustomFeeApplicationScope" AS ENUM ('ENTIRE_SALE', 'PAYMENT_METHOD');

-- CreateEnum
CREATE TYPE "CustomFeeAmountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "custom_fees" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "applicationScope" "CustomFeeApplicationScope" NOT NULL,
    "paymentMethods" "PaymentMethod"[],
    "amountType" "CustomFeeAmountType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_fees_businessId_idx" ON "custom_fees"("businessId");

-- CreateIndex
CREATE INDEX "custom_fees_businessId_isEnabled_idx" ON "custom_fees"("businessId", "isEnabled");

-- CreateIndex
CREATE INDEX "custom_fees_businessId_deletedAt_idx" ON "custom_fees"("businessId", "deletedAt");

-- AddForeignKey
ALTER TABLE "custom_fees" ADD CONSTRAINT "custom_fees_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
