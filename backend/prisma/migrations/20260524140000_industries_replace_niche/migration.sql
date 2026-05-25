-- CreateEnum
CREATE TYPE "IndustryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "industries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "labels" JSONB NOT NULL,
    "pipelineTemplate" JSONB NOT NULL,
    "status" "IndustryStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");

-- Seed default industries
INSERT INTO "industries" ("id", "name", "slug", "description", "labels", "pipelineTemplate", "status", "sortOrder", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'Generic',
    'generic',
    'Default industry for general businesses',
    '{"contacts":"Contacts","pipelines":"Pipelines","leads":"Leads","appointments":"Appointments","conversations":"Conversations"}'::jsonb,
    '{"pipelineName":"Sales Pipeline","stages":[{"name":"New Lead","type":"OPEN"},{"name":"Contacted","type":"OPEN"},{"name":"Qualified","type":"OPEN"},{"name":"Won","type":"WON"},{"name":"Lost","type":"LOST"}]}'::jsonb,
    'ACTIVE',
    0,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'Med Spa',
    'med-spa',
    'Medical spa and aesthetic clinics',
    '{"contacts":"Patients","pipelines":"Treatment Pipelines","leads":"Consultations","appointments":"Consultations","conversations":"Messages"}'::jsonb,
    '{"pipelineName":"Consultation Pipeline","stages":[{"name":"New Lead","type":"OPEN"},{"name":"Contacted","type":"OPEN"},{"name":"Consultation Booked","type":"OPEN"},{"name":"Treatment Done","type":"OPEN"},{"name":"Review Requested","type":"OPEN"},{"name":"Lost","type":"LOST"}]}'::jsonb,
    'ACTIVE',
    1,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'HVAC',
    'hvac',
    'Heating, ventilation, and air conditioning',
    '{"contacts":"Customers","pipelines":"Job Pipelines","leads":"Estimates","appointments":"Jobs","conversations":"Messages"}'::jsonb,
    '{"pipelineName":"Service Job Pipeline","stages":[{"name":"New Request","type":"OPEN"},{"name":"Estimate Sent","type":"OPEN"},{"name":"Job Scheduled","type":"OPEN"},{"name":"Job Completed","type":"OPEN"},{"name":"Follow-up","type":"OPEN"},{"name":"Lost","type":"LOST"}]}'::jsonb,
    'ACTIVE',
    2,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'Legal',
    'legal',
    'Law firms and legal services',
    '{"contacts":"Clients","pipelines":"Case Pipelines","leads":"Consultations","appointments":"Consultations","conversations":"Messages"}'::jsonb,
    '{"pipelineName":"Case Pipeline","stages":[{"name":"New Inquiry","type":"OPEN"},{"name":"Consultation","type":"OPEN"},{"name":"Retained","type":"OPEN"},{"name":"Case Closed","type":"WON"},{"name":"Lost","type":"LOST"}]}'::jsonb,
    'ACTIVE',
    3,
    CURRENT_TIMESTAMP
  );

-- Add industryId to businesses
ALTER TABLE "businesses" ADD COLUMN "industryId" TEXT;

-- Map legacy niche enum to industries
UPDATE "businesses" b
SET "industryId" = i.id
FROM "industries" i
WHERE
  (b."niche" = 'GENERIC' AND i.slug = 'generic')
  OR (b."niche" = 'MED_SPA' AND i.slug = 'med-spa')
  OR (b."niche" = 'HVAC' AND i.slug = 'hvac')
  OR (b."niche" = 'LEGAL' AND i.slug = 'legal');

-- Default any remaining rows to generic
UPDATE "businesses" b
SET "industryId" = (SELECT id FROM "industries" WHERE slug = 'generic' LIMIT 1)
WHERE b."industryId" IS NULL;

ALTER TABLE "businesses" ADD CONSTRAINT "businesses_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "businesses_industryId_idx" ON "businesses"("industryId");

ALTER TABLE "businesses" DROP COLUMN "niche";

DROP TYPE "BusinessNiche";
