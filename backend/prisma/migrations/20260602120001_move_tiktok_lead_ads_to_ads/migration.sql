-- TikTok Lead Ads belongs under Ads (not Social Media / Communication).
UPDATE "integration_providers"
SET
  "category" = 'ADS',
  "sortOrder" = 125,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'tiktok-lead-ads';
