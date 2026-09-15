-- Social Planner Connect catalog: YouTube, X, Pinterest, TikTok (posting).
-- Upserts so Integrations tab shows Connect without a full re-seed.

INSERT INTO "integration_providers" (
  "id",
  "key",
  "name",
  "description",
  "category",
  "isPlatformLevel",
  "isBusinessLevel",
  "connectionType",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    gen_random_uuid()::text,
    'youtube',
    'YouTube',
    'Connect YouTube channels to schedule and upload videos from Social Planner.',
    'SOCIAL_MEDIA',
    false,
    true,
    'OAUTH',
    true,
    95,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'x',
    'X (Twitter)',
    'Connect X accounts to schedule tweets from Social Planner.',
    'SOCIAL_MEDIA',
    false,
    true,
    'OAUTH',
    true,
    96,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'pinterest',
    'Pinterest',
    'Connect Pinterest Business to schedule pins from Social Planner.',
    'SOCIAL_MEDIA',
    false,
    true,
    'OAUTH',
    true,
    97,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'tiktok',
    'TikTok',
    'Connect TikTok to publish videos from Social Planner.',
    'SOCIAL_MEDIA',
    false,
    true,
    'OAUTH',
    true,
    98,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "isPlatformLevel" = EXCLUDED."isPlatformLevel",
  "isBusinessLevel" = EXCLUDED."isBusinessLevel",
  "connectionType" = EXCLUDED."connectionType",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "integration_providers"
SET
  "name" = 'LinkedIn',
  "description" = 'Connect LinkedIn Company Pages for Social Planner posting.',
  "connectionType" = 'OAUTH',
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'linkedin';

UPDATE "integration_providers"
SET
  "name" = 'TikTok Messaging',
  "description" = 'Respond to TikTok direct messages.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'tiktok-messaging';
