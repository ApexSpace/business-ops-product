-- Grant the time_clock module to capability bundles that already include appointments/calendar.

INSERT INTO "capability_module_assignments" ("id", "capabilityId", "moduleKey", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    cma."capabilityId",
    'time_clock',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "capability_module_assignments" cma
WHERE cma."moduleKey" IN ('appointments', 'calendar')
  AND cma."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "capability_module_assignments" existing
    WHERE existing."capabilityId" = cma."capabilityId"
      AND existing."moduleKey" = 'time_clock'
      AND existing."deletedAt" IS NULL
  );
