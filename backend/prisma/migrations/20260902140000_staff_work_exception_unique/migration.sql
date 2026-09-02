-- Deduplicate any existing staff work exceptions before adding uniqueness.
DELETE FROM "staff_work_exceptions" a
USING "staff_work_exceptions" b
WHERE a.id > b.id
  AND a."businessId" = b."businessId"
  AND a."userId" = b."userId"
  AND a."date" = b."date";

CREATE UNIQUE INDEX "staff_work_exceptions_business_user_date_key"
  ON "staff_work_exceptions" ("businessId", "userId", "date");
