-- AlterTable
ALTER TABLE "plan_groups" ADD COLUMN "snapshotId" TEXT;

-- CreateIndex
CREATE INDEX "plan_groups_snapshotId_idx" ON "plan_groups"("snapshotId");

-- AddForeignKey
ALTER TABLE "plan_groups" ADD CONSTRAINT "plan_groups_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
