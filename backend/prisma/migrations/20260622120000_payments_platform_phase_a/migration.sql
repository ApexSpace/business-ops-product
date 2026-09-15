-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayableType" AS ENUM ('INVOICE', 'BOOKING_DEPOSIT', 'FORM_PAYMENT', 'PRODUCT_ORDER', 'GIFT_CARD_ORDER', 'MEMBERSHIP');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'WALLET';

-- AlterEnum
ALTER TYPE "ContactWalletTransactionType" ADD VALUE 'SALE_PAYMENT';
ALTER TYPE "ContactWalletTransactionType" ADD VALUE 'SALE_DEPOSIT';

-- AlterTable payments
ALTER TABLE "payments" ADD COLUMN "payableType" "PayableType" NOT NULL DEFAULT 'INVOICE';
ALTER TABLE "payments" ADD COLUMN "payableId" TEXT;
ALTER TABLE "payments" ADD COLUMN "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCEEDED';
ALTER TABLE "payments" ADD COLUMN "walletTransactionId" TEXT;
ALTER TABLE "payments" ADD COLUMN "contactPaymentMethodId" TEXT;

UPDATE "payments" SET "payableId" = "invoiceId" WHERE "payableId" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "payableId" SET NOT NULL;

ALTER TABLE "payments" ALTER COLUMN "paidAt" DROP NOT NULL;

-- AlterTable contact_wallet_transactions
ALTER TABLE "contact_wallet_transactions" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "contact_wallet_transactions" ADD COLUMN "invoiceId" TEXT;

-- CreateTable contact_stripe_customers
CREATE TABLE "contact_stripe_customers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_stripe_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable contact_payment_methods
CREATE TABLE "contact_payment_methods" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

CREATE INDEX "payments_businessId_payableType_payableId_idx" ON "payments"("businessId", "payableType", "payableId");

CREATE UNIQUE INDEX "contact_stripe_customers_businessId_contactId_key" ON "contact_stripe_customers"("businessId", "contactId");

CREATE INDEX "contact_stripe_customers_businessId_idx" ON "contact_stripe_customers"("businessId");

CREATE UNIQUE INDEX "contact_payment_methods_businessId_stripePaymentMethodId_key" ON "contact_payment_methods"("businessId", "stripePaymentMethodId");

CREATE INDEX "contact_payment_methods_businessId_contactId_idx" ON "contact_payment_methods"("businessId", "contactId");

CREATE INDEX "contact_wallet_transactions_paymentId_idx" ON "contact_wallet_transactions"("paymentId");

-- AddForeignKey
ALTER TABLE "contact_wallet_transactions" ADD CONSTRAINT "contact_wallet_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_wallet_transactions" ADD CONSTRAINT "contact_wallet_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_stripe_customers" ADD CONSTRAINT "contact_stripe_customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_stripe_customers" ADD CONSTRAINT "contact_stripe_customers_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_payment_methods" ADD CONSTRAINT "contact_payment_methods_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_payment_methods" ADD CONSTRAINT "contact_payment_methods_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_contactPaymentMethodId_fkey" FOREIGN KEY ("contactPaymentMethodId") REFERENCES "contact_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
