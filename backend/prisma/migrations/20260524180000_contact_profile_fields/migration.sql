-- Contact profile: phone split, address, timezone, avatar; remove status/notes
ALTER TABLE "contacts" ADD COLUMN "phoneCountryCode" TEXT;
ALTER TABLE "contacts" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "contacts" ADD COLUMN "timezone" TEXT;
ALTER TABLE "contacts" ADD COLUMN "address" TEXT;
ALTER TABLE "contacts" ADD COLUMN "city" TEXT;
ALTER TABLE "contacts" ADD COLUMN "state" TEXT;
ALTER TABLE "contacts" ADD COLUMN "country" TEXT;
ALTER TABLE "contacts" ADD COLUMN "zip" TEXT;
ALTER TABLE "contacts" ADD COLUMN "avatarUrl" TEXT;

UPDATE "contacts"
SET
  "phoneNumber" = "phone",
  "phoneCountryCode" = '+1'
WHERE "phone" IS NOT NULL AND "phone" <> '';

ALTER TABLE "contacts" DROP COLUMN "phone";
ALTER TABLE "contacts" DROP COLUMN "status";
ALTER TABLE "contacts" DROP COLUMN "notes";

DROP INDEX IF EXISTS "contacts_businessId_phone_idx";
CREATE INDEX "contacts_businessId_phoneNumber_idx" ON "contacts"("businessId", "phoneNumber");
