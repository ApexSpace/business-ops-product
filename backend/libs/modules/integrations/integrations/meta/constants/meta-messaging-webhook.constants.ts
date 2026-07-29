/** Page-level messaging webhook fields (Facebook Page / linked Page for Instagram). */
export const META_MESSAGING_PAGE_WEBHOOK_FIELDS = [
  'messages',
  'messaging_postbacks',
  'message_reads',
  'message_deliveries',
  'messaging_referrals',
] as const;

/** @deprecated Use META_MESSAGING_PAGE_WEBHOOK_FIELDS */
export const META_FACEBOOK_PAGE_WEBHOOK_FIELDS =
  META_MESSAGING_PAGE_WEBHOOK_FIELDS;

/** Instagram uses the same linked Page subscription fields as Messenger. */
export const META_INSTAGRAM_PAGE_WEBHOOK_FIELDS =
  META_MESSAGING_PAGE_WEBHOOK_FIELDS;

/** App-level webhook fields for the Instagram object type (requires HTTPS callback). */
export const META_INSTAGRAM_APP_WEBHOOK_FIELDS = [
  'messages',
  'messaging_postbacks',
  'messaging_seen',
] as const;

/** App-level webhook fields for the Page object type (Messenger). */
export const META_PAGE_APP_WEBHOOK_FIELDS = [
  'messages',
  'messaging_postbacks',
  'message_reads',
  'message_deliveries',
] as const;
