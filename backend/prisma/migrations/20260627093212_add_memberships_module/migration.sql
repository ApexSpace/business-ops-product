-- CreateEnum
CREATE TYPE "MembershipPlanType" AS ENUM ('SERVICES', 'ACCOUNT_CREDIT');

-- CreateEnum
CREATE TYPE "MembershipBillingIntervalUnit" AS ENUM ('WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "MembershipCommissionBasis" AS ENUM ('REGULAR_PRICE', 'DISCOUNTED_PRICE');

-- CreateEnum
CREATE TYPE "ClientMembershipStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'PAUSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "MembershipBillingEventType" AS ENUM ('PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'PAYMENT_RETRYING', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_PAUSED', 'SUBSCRIPTION_RESUMED', 'SUBSCRIPTION_RENEWED');

-- AlterEnum
ALTER TYPE "ContactWalletTransactionType" ADD VALUE 'MEMBERSHIP_CREDIT';

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "planType" "MembershipPlanType" NOT NULL DEFAULT 'SERVICES',
    "billingIntervalCount" INTEGER NOT NULL DEFAULT 1,
    "billingIntervalUnit" "MembershipBillingIntervalUnit" NOT NULL DEFAULT 'MONTH',
    "price" DECIMAL(10,2) NOT NULL,
    "chargeServiceTax" BOOLEAN NOT NULL DEFAULT false,
    "servicesExpireAfter" INTEGER,
    "creditAmount" DECIMAL(10,2),
    "productDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "serviceDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "requireAgreement" BOOLEAN NOT NULL DEFAULT false,
    "agreementText" TEXT,
    "availableOnline" BOOLEAN NOT NULL DEFAULT false,
    "shortDescription" TEXT,
    "description" TEXT,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "commissionBasis" "MembershipCommissionBasis" NOT NULL DEFAULT 'REGULAR_PRICE',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_service_groups" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "groupPrice" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "membership_service_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_service_group_items" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "membership_service_group_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_memberships" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "ClientMembershipStatus" NOT NULL DEFAULT 'SCHEDULED',
    "price" DECIMAL(10,2) NOT NULL,
    "productDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "serviceDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "agreementAcceptedAt" TIMESTAMP(3),
    "planVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_usage_records" (
    "id" TEXT NOT NULL,
    "clientMembershipId" TEXT NOT NULL,
    "serviceGroupId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "totalSlots" INTEGER NOT NULL,
    "usedSlots" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "saleLineItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_billing_events" (
    "id" TEXT NOT NULL,
    "clientMembershipId" TEXT NOT NULL,
    "eventType" "MembershipBillingEventType" NOT NULL,
    "amount" DECIMAL(10,2),
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "membership_billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "allowClientCancel" BOOLEAN NOT NULL DEFAULT true,
    "onlineSalesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_plans_businessId_idx" ON "membership_plans"("businessId");

-- CreateIndex
CREATE INDEX "membership_plans_businessId_isArchived_idx" ON "membership_plans"("businessId", "isArchived");

-- CreateIndex
CREATE INDEX "membership_service_groups_planId_idx" ON "membership_service_groups"("planId");

-- CreateIndex
CREATE INDEX "membership_service_group_items_groupId_idx" ON "membership_service_group_items"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_service_group_items_groupId_serviceId_key" ON "membership_service_group_items"("groupId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "client_memberships_stripeSubscriptionId_key" ON "client_memberships"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "client_memberships_businessId_idx" ON "client_memberships"("businessId");

-- CreateIndex
CREATE INDEX "client_memberships_contactId_idx" ON "client_memberships"("contactId");

-- CreateIndex
CREATE INDEX "client_memberships_planId_idx" ON "client_memberships"("planId");

-- CreateIndex
CREATE INDEX "client_memberships_businessId_status_idx" ON "client_memberships"("businessId", "status");

-- CreateIndex
CREATE INDEX "membership_usage_records_clientMembershipId_idx" ON "membership_usage_records"("clientMembershipId");

-- CreateIndex
CREATE INDEX "membership_usage_records_serviceGroupId_idx" ON "membership_usage_records"("serviceGroupId");

-- CreateIndex
CREATE INDEX "membership_usage_records_expiresAt_idx" ON "membership_usage_records"("expiresAt");

-- CreateIndex
CREATE INDEX "membership_billing_events_clientMembershipId_idx" ON "membership_billing_events"("clientMembershipId");

-- CreateIndex
CREATE INDEX "membership_billing_events_stripeInvoiceId_idx" ON "membership_billing_events"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_settings_businessId_key" ON "membership_settings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_settings_publicSlug_key" ON "membership_settings"("publicSlug");

-- AddForeignKey
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_service_groups" ADD CONSTRAINT "membership_service_groups_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_service_group_items" ADD CONSTRAINT "membership_service_group_items_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "membership_service_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_service_group_items" ADD CONSTRAINT "membership_service_group_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_memberships" ADD CONSTRAINT "client_memberships_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_memberships" ADD CONSTRAINT "client_memberships_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_memberships" ADD CONSTRAINT "client_memberships_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_usage_records" ADD CONSTRAINT "membership_usage_records_clientMembershipId_fkey" FOREIGN KEY ("clientMembershipId") REFERENCES "client_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_usage_records" ADD CONSTRAINT "membership_usage_records_serviceGroupId_fkey" FOREIGN KEY ("serviceGroupId") REFERENCES "membership_service_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_billing_events" ADD CONSTRAINT "membership_billing_events_clientMembershipId_fkey" FOREIGN KEY ("clientMembershipId") REFERENCES "client_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_settings" ADD CONSTRAINT "membership_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
