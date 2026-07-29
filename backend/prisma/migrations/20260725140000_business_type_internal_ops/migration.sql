-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('TENANT', 'INTERNAL');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "type" "BusinessType" NOT NULL DEFAULT 'TENANT';

-- CreateIndex
CREATE INDEX "businesses_type_idx" ON "businesses"("type");

-- At most one INTERNAL business (platform ops tenant)
CREATE UNIQUE INDEX "businesses_one_internal_type_uidx"
  ON "businesses" ("type")
  WHERE "type" = 'INTERNAL';

-- Seed CodeSol Ops INTERNAL business + FREE_INTERNAL subscription (no Stripe IDs)
INSERT INTO "businesses" ("id", "name", "status", "type", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'CodeSol Ops',
  'ACTIVE',
  'INTERNAL',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "business_subscriptions" (
  "id",
  "businessId",
  "status",
  "paymentMethod",
  "paymentStatus",
  "billingSource",
  "cancelAtPeriodEnd",
  "createdAt",
  "updatedAt"
)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'INTERNAL',
  'FREE_INTERNAL',
  'NOT_REQUIRED',
  'INTERNAL',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Belt-and-suspenders: Forms feature grants for public/entitlement paths
INSERT INTO "business_feature_grants" (
  "id", "businessId", "featureKey", "source", "status", "createdAt", "updatedAt"
)
VALUES
  (gen_random_uuid()::text, '00000000-0000-4000-8000-000000000001', 'forms.list', 'MANUAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '00000000-0000-4000-8000-000000000001', 'forms.create', 'MANUAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '00000000-0000-4000-8000-000000000001', 'forms.edit', 'MANUAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '00000000-0000-4000-8000-000000000001', 'forms.delete', 'MANUAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
