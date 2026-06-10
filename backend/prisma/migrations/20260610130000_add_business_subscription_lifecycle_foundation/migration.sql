-- CreateEnum
CREATE TYPE "BusinessSubscriptionEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'PLAN_CHANGED', 'UPGRADED', 'DOWNGRADED', 'TRIAL_STARTED', 'TRIAL_EXTENDED', 'TRIAL_EXPIRED', 'PAYMENT_MARKED_PAID', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED', 'PARTIAL_PAYMENT_RECORDED', 'CANCELED', 'EXPIRED', 'REACTIVATED', 'SUSPENDED', 'BUSINESS_STATUS_CHANGED', 'CAPABILITIES_SYNCED', 'SNAPSHOT_CHANGED', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BusinessSubscriptionEventSource" AS ENUM ('ADMIN', 'SYSTEM', 'PUBLIC_SIGNUP', 'WEBHOOK', 'IMPORT');

-- CreateEnum
CREATE TYPE "BusinessSubscriptionEventSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BusinessSubscriptionPaymentType" AS ENUM ('SUBSCRIPTION', 'SETUP_FEE', 'TRIAL_CONVERSION', 'UPGRADE_PRORATION', 'REFUND', 'CREDIT', 'ADJUSTMENT', 'MANUAL_PAYMENT');

-- CreateEnum
CREATE TYPE "BusinessSubscriptionPaymentDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "BusinessSubscriptionBillingCycle" AS ENUM ('MONTHLY', 'YEARLY', 'ONE_TIME', 'CUSTOM');

-- CreateTable
CREATE TABLE "business_subscription_events" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "eventType" "BusinessSubscriptionEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fromState" JSONB,
    "toState" JSONB,
    "source" "BusinessSubscriptionEventSource" NOT NULL DEFAULT 'ADMIN',
    "severity" "BusinessSubscriptionEventSeverity" NOT NULL DEFAULT 'INFO',
    "correlationId" TEXT NOT NULL,
    "actionKey" TEXT,
    "paymentId" TEXT,
    "planTierIdBefore" TEXT,
    "planTierIdAfter" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdByNameSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_subscription_payments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" "SubscriptionPaymentMethod" NOT NULL,
    "paymentStatus" "SubscriptionPaymentStatus" NOT NULL,
    "paymentType" "BusinessSubscriptionPaymentType" NOT NULL,
    "billingCycle" "BusinessSubscriptionBillingCycle" NOT NULL,
    "direction" "BusinessSubscriptionPaymentDirection" NOT NULL DEFAULT 'INCOMING',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "externalProvider" TEXT,
    "externalPaymentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_subscription_events_businessId_idx" ON "business_subscription_events"("businessId");

-- CreateIndex
CREATE INDEX "business_subscription_events_subscriptionId_idx" ON "business_subscription_events"("subscriptionId");

-- CreateIndex
CREATE INDEX "business_subscription_events_eventType_idx" ON "business_subscription_events"("eventType");

-- CreateIndex
CREATE INDEX "business_subscription_events_createdAt_idx" ON "business_subscription_events"("createdAt");

-- CreateIndex
CREATE INDEX "business_subscription_events_correlationId_idx" ON "business_subscription_events"("correlationId");

-- CreateIndex
CREATE INDEX "business_subscription_events_actionKey_idx" ON "business_subscription_events"("actionKey");

-- CreateIndex
CREATE INDEX "business_subscription_events_planTierIdBefore_idx" ON "business_subscription_events"("planTierIdBefore");

-- CreateIndex
CREATE INDEX "business_subscription_events_planTierIdAfter_idx" ON "business_subscription_events"("planTierIdAfter");

-- CreateIndex
CREATE INDEX "business_subscription_payments_businessId_idx" ON "business_subscription_payments"("businessId");

-- CreateIndex
CREATE INDEX "business_subscription_payments_subscriptionId_idx" ON "business_subscription_payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "business_subscription_payments_paymentStatus_idx" ON "business_subscription_payments"("paymentStatus");

-- CreateIndex
CREATE INDEX "business_subscription_payments_paymentMethod_idx" ON "business_subscription_payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "business_subscription_payments_paymentType_idx" ON "business_subscription_payments"("paymentType");

-- CreateIndex
CREATE INDEX "business_subscription_payments_direction_idx" ON "business_subscription_payments"("direction");

-- CreateIndex
CREATE INDEX "business_subscription_payments_paidAt_idx" ON "business_subscription_payments"("paidAt");

-- CreateIndex
CREATE INDEX "business_subscription_payments_dueDate_idx" ON "business_subscription_payments"("dueDate");

-- CreateIndex
CREATE INDEX "business_subscription_payments_recordedAt_idx" ON "business_subscription_payments"("recordedAt");

-- CreateIndex
CREATE INDEX "business_subscription_payments_voidedAt_idx" ON "business_subscription_payments"("voidedAt");

-- AddForeignKey
ALTER TABLE "business_subscription_events" ADD CONSTRAINT "business_subscription_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_events" ADD CONSTRAINT "business_subscription_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "business_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_events" ADD CONSTRAINT "business_subscription_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "business_subscription_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_events" ADD CONSTRAINT "business_subscription_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_payments" ADD CONSTRAINT "business_subscription_payments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_payments" ADD CONSTRAINT "business_subscription_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "business_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_payments" ADD CONSTRAINT "business_subscription_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
