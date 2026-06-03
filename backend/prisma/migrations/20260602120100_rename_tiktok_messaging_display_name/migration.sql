UPDATE "integration_providers"
SET
  "name" = 'TikTok',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'tiktok-messaging';
