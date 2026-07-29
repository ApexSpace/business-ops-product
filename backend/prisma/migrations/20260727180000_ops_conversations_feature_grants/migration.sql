-- Conversations + messaging readiness feature grants for CodeSol Ops INTERNAL business
INSERT INTO "business_feature_grants" (
  "id", "businessId", "featureKey", "source", "status", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, '00000000-0000-4000-8000-000000000001', v."featureKey", 'MANUAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('conversations.inbox'),
  ('conversations.read'),
  ('conversations.send'),
  ('conversations.whatsapp_templates_view'),
  ('conversations.whatsapp_templates_manage'),
  ('sms.two_way'),
  ('contacts.list'),
  ('contacts.create'),
  ('contacts.edit'),
  ('contacts.conversation')
) AS v("featureKey")
WHERE NOT EXISTS (
  SELECT 1
  FROM "business_feature_grants" g
  WHERE g."businessId" = '00000000-0000-4000-8000-000000000001'
    AND g."featureKey" = v."featureKey"
    AND g."status" = 'ACTIVE'
);
