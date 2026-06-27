-- Grant the resources module to capability bundles that already include calendar
-- (operations settings parity for existing businesses).

INSERT INTO "capability_module_assignments" ("id", "capabilityId", "moduleKey", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    cma."capabilityId",
    'resources',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "capability_module_assignments" cma
WHERE cma."moduleKey" = 'calendar'
  AND cma."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "capability_module_assignments" existing
    WHERE existing."capabilityId" = cma."capabilityId"
      AND existing."moduleKey" = 'resources'
      AND existing."deletedAt" IS NULL
  );
