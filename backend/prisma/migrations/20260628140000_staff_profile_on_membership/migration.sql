-- Staff profile fields on business memberships (direct add flow).

CREATE TYPE "StaffGender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

ALTER TABLE "business_memberships" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "business_memberships" ADD COLUMN "gender" "StaffGender";
ALTER TABLE "business_memberships" ADD COLUMN "isServiceProvider" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_memberships" ADD COLUMN "canAssignProductSales" BOOLEAN NOT NULL DEFAULT false;
