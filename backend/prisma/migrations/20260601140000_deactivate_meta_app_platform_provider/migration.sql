-- Meta platform credentials are env-based; hide meta-app from platform integrations UI
UPDATE "integration_providers"
SET "isActive" = false
WHERE "key" = 'meta-app';
