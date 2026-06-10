-- Module-level capability assignments (admin-facing unit)

CREATE TABLE "capability_module_assignments" (
    "id" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_module_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "capability_module_assignments_capabilityId_moduleKey_key" ON "capability_module_assignments"("capabilityId", "moduleKey");
CREATE INDEX "capability_module_assignments_capabilityId_idx" ON "capability_module_assignments"("capabilityId");
CREATE INDEX "capability_module_assignments_moduleKey_idx" ON "capability_module_assignments"("moduleKey");

ALTER TABLE "capability_module_assignments" ADD CONSTRAINT "capability_module_assignments_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill module assignments from existing feature assignments (uses current registry_features.moduleKey)
INSERT INTO "capability_module_assignments" ("id", "capabilityId", "moduleKey", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    cfa."capabilityId",
    rf."moduleKey",
    MIN(cfa."createdAt"),
    MAX(cfa."updatedAt")
FROM "capability_feature_assignments" cfa
INNER JOIN "registry_features" rf ON rf."key" = cfa."featureKey"
WHERE cfa."deletedAt" IS NULL
GROUP BY cfa."capabilityId", rf."moduleKey"
ON CONFLICT ("capabilityId", "moduleKey") DO NOTHING;
