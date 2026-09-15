-- AlterTable
ALTER TABLE "business_memberships" ADD COLUMN     "timeclockPin" TEXT;

-- CreateTable
CREATE TABLE "time_cards" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clockInTime" TIMESTAMP(3) NOT NULL,
    "clockOutTime" TIMESTAMP(3),
    "paidMinutes" INTEGER,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_cards_businessId_userId_idx" ON "time_cards"("businessId", "userId");

-- CreateIndex
CREATE INDEX "time_cards_businessId_clockInTime_idx" ON "time_cards"("businessId", "clockInTime" DESC);

-- AddForeignKey
ALTER TABLE "time_cards" ADD CONSTRAINT "time_cards_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_cards" ADD CONSTRAINT "time_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
