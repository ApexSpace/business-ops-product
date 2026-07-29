-- CreateEnum
CREATE TYPE "OfferApplicationMode" AS ENUM ('STAFF_ONLY', 'OFFER_CODE', 'AUTOMATICALLY');

-- CreateEnum
CREATE TYPE "OfferMembershipScope" AS ENUM ('ANY', 'SPECIFIC');

-- CreateEnum
CREATE TYPE "DiscountAppliesTo" AS ENUM ('SERVICES', 'PRODUCTS', 'ENTIRE_SALE');

-- CreateEnum
CREATE TYPE "DiscountAmountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('ALL', 'SPECIFIC');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "applicationMode" "OfferApplicationMode" NOT NULL DEFAULT 'STAFF_ONLY',
    "offerCode" TEXT,
    "autoApptDateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoApptDateRules" JSONB,
    "autoBookingDateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoBookingDateRules" JSONB,
    "autoSaleDateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoSaleDateRules" JSONB,
    "minAmountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "minAmount" DECIMAL(10,2),
    "oncePerClient" BOOLEAN NOT NULL DEFAULT false,
    "newClientsOnly" BOOLEAN NOT NULL DEFAULT false,
    "membershipRequired" BOOLEAN NOT NULL DEFAULT false,
    "membershipScope" "OfferMembershipScope",
    "specificMembershipPlanIds" JSONB,
    "specificProvidersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "specificProviderIds" JSONB,
    "commissionBasis" "MembershipCommissionBasis" NOT NULL DEFAULT 'REGULAR_PRICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_discounts" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "appliesTo" "DiscountAppliesTo" NOT NULL,
    "amountType" "DiscountAmountType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "serviceScope" "DiscountScope" NOT NULL DEFAULT 'ALL',
    "productScope" "DiscountScope" NOT NULL DEFAULT 'ALL',
    "specificServiceCategoryIds" JSONB,
    "specificServiceIds" JSONB,
    "specificProductCategoryIds" JSONB,
    "specificProductIds" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_usage_logs" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "saleId" TEXT,
    "discountAmount" DECIMAL(10,2),
    "offerCodeUsed" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offers_businessId_idx" ON "offers"("businessId");

-- CreateIndex
CREATE INDEX "offers_businessId_isEnabled_idx" ON "offers"("businessId", "isEnabled");

-- CreateIndex
CREATE INDEX "offers_businessId_offerCode_idx" ON "offers"("businessId", "offerCode");

-- CreateIndex
CREATE INDEX "offer_discounts_offerId_idx" ON "offer_discounts"("offerId");

-- CreateIndex
CREATE INDEX "offer_usage_logs_offerId_idx" ON "offer_usage_logs"("offerId");

-- CreateIndex
CREATE INDEX "offer_usage_logs_businessId_idx" ON "offer_usage_logs"("businessId");

-- CreateIndex
CREATE INDEX "offer_usage_logs_contactId_idx" ON "offer_usage_logs"("contactId");

-- CreateIndex
CREATE INDEX "offer_usage_logs_saleId_idx" ON "offer_usage_logs"("saleId");

-- CreateIndex
CREATE INDEX "offer_usage_logs_businessId_usedAt_idx" ON "offer_usage_logs"("businessId", "usedAt");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_discounts" ADD CONSTRAINT "offer_discounts_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_usage_logs" ADD CONSTRAINT "offer_usage_logs_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_usage_logs" ADD CONSTRAINT "offer_usage_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_usage_logs" ADD CONSTRAINT "offer_usage_logs_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
