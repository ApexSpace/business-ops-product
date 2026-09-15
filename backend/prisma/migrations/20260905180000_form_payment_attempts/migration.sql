-- CreateEnum
CREATE TYPE "FormPaymentAttemptStatus" AS ENUM ('CREATED', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'CANCELED', 'SUCCEEDED_PENDING_SUBMISSION');

-- CreateEnum
CREATE TYPE "FormPaymentRail" AS ENUM ('PLATFORM', 'CONNECT');

-- CreateTable
CREATE TABLE "form_payment_attempts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "livemode" BOOLEAN NOT NULL DEFAULT true,
    "rail" "FormPaymentRail" NOT NULL,
    "status" "FormPaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "stripePaymentIntentId" TEXT NOT NULL,
    "stripeChargeId" TEXT,
    "formSubmissionId" TEXT,
    "paymentId" TEXT,
    "payerEmail" TEXT,
    "payerName" TEXT,
    "payerPhone" TEXT,
    "formDataSnapshot" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_payment_attempts_stripePaymentIntentId_key" ON "form_payment_attempts"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "form_payment_attempts_businessId_idx" ON "form_payment_attempts"("businessId");

-- CreateIndex
CREATE INDEX "form_payment_attempts_businessId_status_idx" ON "form_payment_attempts"("businessId", "status");

-- CreateIndex
CREATE INDEX "form_payment_attempts_businessId_rail_idx" ON "form_payment_attempts"("businessId", "rail");

-- CreateIndex
CREATE INDEX "form_payment_attempts_formId_idx" ON "form_payment_attempts"("formId");

-- CreateIndex
CREATE INDEX "form_payment_attempts_formSubmissionId_idx" ON "form_payment_attempts"("formSubmissionId");

-- CreateIndex
CREATE INDEX "form_payment_attempts_createdAt_idx" ON "form_payment_attempts"("createdAt");

-- AddForeignKey
ALTER TABLE "form_payment_attempts" ADD CONSTRAINT "form_payment_attempts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_payment_attempts" ADD CONSTRAINT "form_payment_attempts_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_payment_attempts" ADD CONSTRAINT "form_payment_attempts_formSubmissionId_fkey" FOREIGN KEY ("formSubmissionId") REFERENCES "form_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
