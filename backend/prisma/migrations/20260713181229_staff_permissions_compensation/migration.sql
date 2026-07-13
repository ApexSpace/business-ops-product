-- AlterTable
ALTER TABLE "business_memberships" ADD COLUMN     "notificationSettings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "staff_compensation_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceCommissionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "serviceCommissionMode" TEXT,
    "serviceCommissionPercent" DECIMAL(5,2),
    "productCommissionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "productCommissionPercent" DECIMAL(5,2),
    "productCommissionOverridesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "hourlyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DECIMAL(12,2),
    "greaterOfEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_compensation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_compensation_settings_businessId_idx" ON "staff_compensation_settings"("businessId");

-- CreateIndex
CREATE INDEX "staff_compensation_settings_userId_idx" ON "staff_compensation_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_compensation_settings_businessId_userId_key" ON "staff_compensation_settings"("businessId", "userId");

-- AddForeignKey
ALTER TABLE "staff_compensation_settings" ADD CONSTRAINT "staff_compensation_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_compensation_settings" ADD CONSTRAINT "staff_compensation_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
