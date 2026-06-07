-- Migrate flat chatbot columns to grouped JSON settings (idempotent if already JSON-only).

ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "appearanceSettings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "chatWindowSettings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "messagingSettings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "businessHoursSettings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "formSettings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "botSettings" JSONB NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbots' AND column_name = 'widgetTitle'
  ) THEN
    UPDATE "chatbots" SET
      "appearanceSettings" = jsonb_build_object(
        'placement', COALESCE("position"::text, 'BOTTOM_RIGHT'),
        'theme', 'light',
        'primaryColor', COALESCE("primaryColor", '#2563eb'),
        'avatarUrl', "avatarUrl",
        'launcherIcon', 'message',
        'offsetX', 20,
        'offsetY', 20,
        'width', 380,
        'height', 600,
        'showBranding', COALESCE("showBranding", true),
        'consentEnabled', false,
        'consentText', null
      ),
      "chatWindowSettings" = jsonb_build_object(
        'language', 'en',
        'title', "widgetTitle",
        'introMessage', "welcomeMessage",
        'offlineMessage', "offlineMessage",
        'handoffMessage', "handoffMessage",
        'liveChatEnabled', true,
        'acknowledgementMessage', 'We typically reply soon'
      ),
      "messagingSettings" = jsonb_build_object(
        'welcomeMessage', "welcomeMessage",
        'fallbackMessage', "fallbackMessage",
        'offlineMessage', "offlineMessage",
        'autoReplyEnabled', COALESCE("autoReplyEnabled", true),
        'aiEnabled', COALESCE("aiEnabled", false),
        'businessHoursOnly', COALESCE("businessHoursOnly", false)
      ),
      "businessHoursSettings" = jsonb_build_object(
        'enabled', COALESCE("businessHoursOnly", false),
        'timezone', 'UTC',
        'schedule', '{}'::jsonb
      ),
      "formSettings" = jsonb_build_object(
        'collectContactInfo', COALESCE("collectContactInfo", true),
        'requireName', COALESCE("requireName", true),
        'requireEmail', COALESCE("requireEmail", false),
        'requirePhone', COALESCE("requirePhone", false),
        'showNotesField', COALESCE("showNotesField", false),
        'allowAnonymous', COALESCE("allowAnonymous", true)
      ),
      "botSettings" = jsonb_build_object(
        'embedEnabled', COALESCE("embedEnabled", true),
        'knowledgeBaseText', "knowledgeBaseText"
      );

    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "avatarUrl";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "widgetTitle";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "welcomeMessage";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "fallbackMessage";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "offlineMessage";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "handoffMessage";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "primaryColor";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "position";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "collectContactInfo";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "requireName";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "requireEmail";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "requirePhone";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "showNotesField";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "allowAnonymous";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "autoReplyEnabled";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "aiEnabled";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "knowledgeBaseText";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "businessHoursOnly";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "showBranding";
    ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "embedEnabled";
  END IF;
END $$;
