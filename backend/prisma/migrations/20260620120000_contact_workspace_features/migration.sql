-- CreateEnum
CREATE TYPE "ContactWalletTransactionType" AS ENUM ('MANUAL_CREDIT', 'MANUAL_DEBIT', 'PAYMENT', 'REFUND');

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN "clientNotes" TEXT;

-- CreateTable
CREATE TABLE "contact_wallet_balances" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_wallet_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_wallet_transactions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "ContactWalletTransactionType" NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_service_adjustments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_service_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_wallet_balances_contactId_key" ON "contact_wallet_balances"("contactId");

-- CreateIndex
CREATE INDEX "contact_wallet_balances_businessId_idx" ON "contact_wallet_balances"("businessId");

-- CreateIndex
CREATE INDEX "contact_wallet_transactions_businessId_idx" ON "contact_wallet_transactions"("businessId");

-- CreateIndex
CREATE INDEX "contact_wallet_transactions_businessId_contactId_idx" ON "contact_wallet_transactions"("businessId", "contactId");

-- CreateIndex
CREATE INDEX "contact_wallet_transactions_businessId_contactId_createdAt_idx" ON "contact_wallet_transactions"("businessId", "contactId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_service_adjustments_businessId_contactId_idx" ON "contact_service_adjustments"("businessId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_service_adjustments_businessId_contactId_serviceId_key" ON "contact_service_adjustments"("businessId", "contactId", "serviceId");

-- AddForeignKey
ALTER TABLE "contact_wallet_balances" ADD CONSTRAINT "contact_wallet_balances_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_wallet_balances" ADD CONSTRAINT "contact_wallet_balances_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_wallet_transactions" ADD CONSTRAINT "contact_wallet_transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_wallet_transactions" ADD CONSTRAINT "contact_wallet_transactions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_wallet_transactions" ADD CONSTRAINT "contact_wallet_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_service_adjustments" ADD CONSTRAINT "contact_service_adjustments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_service_adjustments" ADD CONSTRAINT "contact_service_adjustments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_service_adjustments" ADD CONSTRAINT "contact_service_adjustments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
