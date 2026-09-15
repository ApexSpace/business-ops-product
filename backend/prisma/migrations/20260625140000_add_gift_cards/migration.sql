-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "GiftCardSource" AS ENUM ('MANUAL', 'POS_SALE', 'ONLINE_PURCHASE');

-- CreateEnum
CREATE TYPE "GiftCardTransactionType" AS ENUM ('INITIAL_VALUE', 'REDEMPTION', 'REFUND', 'ADJUSTMENT', 'VOID');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'GIFT_CARD';

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "initialValue" DECIMAL(10,2) NOT NULL,
    "currentBalance" DECIMAL(10,2) NOT NULL,
    "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "GiftCardSource" NOT NULL,
    "notes" TEXT,
    "purchasingContactId" TEXT,
    "ownerContactId" TEXT NOT NULL,
    "promotionId" TEXT,
    "invoiceId" TEXT,
    "artworkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_transactions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "type" "GiftCardTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "invoiceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_promotions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cardValue" DECIMAL(10,2) NOT NULL,
    "salePrice" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_card_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "onlineSalesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "purchaseDisclaimer" TEXT,
    "selectedArtworkKey" TEXT,
    "autoGenerateNumber" BOOLEAN NOT NULL DEFAULT false,
    "internalNotifyEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_card_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_businessId_number_key" ON "gift_cards"("businessId", "number");

-- CreateIndex
CREATE INDEX "gift_cards_businessId_idx" ON "gift_cards"("businessId");

-- CreateIndex
CREATE INDEX "gift_cards_ownerContactId_idx" ON "gift_cards"("ownerContactId");

-- CreateIndex
CREATE INDEX "gift_cards_businessId_status_idx" ON "gift_cards"("businessId", "status");

-- CreateIndex
CREATE INDEX "gift_card_transactions_giftCardId_idx" ON "gift_card_transactions"("giftCardId");

-- CreateIndex
CREATE INDEX "gift_card_transactions_businessId_giftCardId_idx" ON "gift_card_transactions"("businessId", "giftCardId");

-- CreateIndex
CREATE INDEX "gift_card_promotions_businessId_idx" ON "gift_card_promotions"("businessId");

-- CreateIndex
CREATE INDEX "gift_card_promotions_businessId_isActive_idx" ON "gift_card_promotions"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "gift_card_settings_businessId_key" ON "gift_card_settings"("businessId");

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "giftCardId" TEXT;

-- CreateIndex
CREATE INDEX "payments_businessId_giftCardId_idx" ON "payments"("giftCardId");

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchasingContactId_fkey" FOREIGN KEY ("purchasingContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_ownerContactId_fkey" FOREIGN KEY ("ownerContactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "gift_card_promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_promotions" ADD CONSTRAINT "gift_card_promotions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_settings" ADD CONSTRAINT "gift_card_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
