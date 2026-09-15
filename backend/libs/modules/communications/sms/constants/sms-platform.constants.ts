export const SMS_PROVIDER_KEY = 'sms';

/** IntegrationResource.externalId for the legacy shared env platform number. */
export const PLATFORM_SMS_RESOURCE_EXTERNAL_ID = 'platform-default';

/** Legacy: all businesses share TWILIO_PLATFORM_FROM_NUMBER (no per-business purchase). */
export const PLATFORM_SMS_METADATA_TYPE = 'PLATFORM_SHARED';

/**
 * Phase 1: PandaCue-purchased US local number for this business (outbound notifications).
 * Number lives on the primary Twilio account under the shared A2P Messaging Service.
 */
export const PLATFORM_PROVISIONED_SMS_METADATA_TYPE = 'PLATFORM_PROVISIONED';

export const BUSINESS_SMS_METADATA_TYPE = 'BUSINESS_OWNED';

/** A2P registration pool — SHARED = PandaCue Brand/Campaign (Phase 1). */
export const SMS_A2P_POOL_SHARED = 'SHARED';

/**
 * Future (Phase 3): paid business graduates to own Brand + Campaign.
 * @see sms-a2p-lifecycle.constants.ts
 */
export const SMS_A2P_POOL_OWNED = 'OWNED';
