-- Ensure Meta business providers use automated connect (not manual forms)
UPDATE "integration_providers"
SET "connectionType" = 'OAUTH'
WHERE "key" IN ('facebook', 'instagram');

UPDATE "integration_providers"
SET "connectionType" = 'EMBEDDED_SIGNUP'
WHERE "key" = 'whatsapp';
