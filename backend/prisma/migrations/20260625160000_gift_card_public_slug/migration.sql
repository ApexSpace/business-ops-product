-- Add standalone public slug for online gift card sales (independent of calendar booking).
ALTER TABLE "gift_card_settings" ADD COLUMN "publicSlug" TEXT;

CREATE UNIQUE INDEX "gift_card_settings_publicSlug_key" ON "gift_card_settings"("publicSlug");
