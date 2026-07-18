-- Contact-level messaging block (all channels).
ALTER TABLE "contacts" ADD COLUMN "blockedAt" TIMESTAMP(3);
ALTER TABLE "contacts" ADD COLUMN "blockedByUserId" TEXT;

CREATE INDEX "contacts_businessId_blockedAt_idx" ON "contacts"("businessId", "blockedAt");

ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_blockedByUserId_fkey"
  FOREIGN KEY ("blockedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
