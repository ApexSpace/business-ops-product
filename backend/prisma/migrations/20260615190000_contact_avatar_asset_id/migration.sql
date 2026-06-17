-- AlterTable
ALTER TABLE "contacts" ADD COLUMN "avatarAssetId" TEXT;

-- CreateIndex
CREATE INDEX "contacts_avatarAssetId_idx" ON "contacts"("avatarAssetId");
