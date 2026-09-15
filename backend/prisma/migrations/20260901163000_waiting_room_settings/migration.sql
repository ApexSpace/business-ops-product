-- CreateTable
CREATE TABLE "business_waiting_room_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "waitingStatusEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_waiting_room_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_waiting_room_settings_businessId_key" ON "business_waiting_room_settings"("businessId");

-- CreateIndex
CREATE INDEX "business_waiting_room_settings_businessId_idx" ON "business_waiting_room_settings"("businessId");

-- AddForeignKey
ALTER TABLE "business_waiting_room_settings" ADD CONSTRAINT "business_waiting_room_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
