export interface TwilioConfig {
  enabled: boolean;
  accountSid: string | null;
  authToken: string | null;
  platformFromNumber: string | null;
  webhookAuthToken: string | null;
  /** Shared A2P Messaging Service SID — auto-assigned numbers join this sender pool. */
  messagingServiceSid: string | null;
  /** Fallback NANP area code when business phone has none (e.g. "512"). */
  defaultAreaCode: string | null;
  /**
   * When false, skip buying US local numbers on business create / ensure.
   * Falls back to TWILIO_PLATFORM_FROM_NUMBER only. Default true.
   */
  autoPurchaseNumbers: boolean;
}

export function resolveTwilioConfig(
  env: NodeJS.ProcessEnv = process.env,
): TwilioConfig {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim() || null;
  const authToken = env.TWILIO_AUTH_TOKEN?.trim() || null;
  const platformFromNumber =
    env.TWILIO_PLATFORM_FROM_NUMBER?.trim() ||
    env.TWILIO_FROM_NUMBER?.trim() ||
    null;
  const messagingServiceSid =
    env.TWILIO_SHARED_MESSAGING_SERVICE_SID?.trim() ||
    env.TWILIO_MESSAGING_SERVICE_SID?.trim() ||
    null;
  const defaultAreaCode =
    env.TWILIO_DEFAULT_AREA_CODE?.replace(/\D/g, '').slice(0, 3) || null;

  return {
    enabled:
      (env.TWILIO_ENABLED ?? 'false').toLowerCase() === 'true' &&
      Boolean(accountSid && authToken && platformFromNumber),
    accountSid,
    authToken,
    platformFromNumber,
    webhookAuthToken: authToken,
    messagingServiceSid,
    defaultAreaCode:
      defaultAreaCode && /^[2-9]\d{2}$/.test(defaultAreaCode)
        ? defaultAreaCode
        : null,
    // Default true unless explicitly set to "false" (local/test kill-switch).
    autoPurchaseNumbers:
      (env.TWILIO_AUTO_PURCHASE_NUMBERS ?? 'true').toLowerCase() !== 'false',
  };
}

export function normalizeE164Phone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('1') && digits.length === 11
    ? `+${digits}`
    : `+${digits}`;
}
