export interface TwilioConfig {
  enabled: boolean;
  accountSid: string | null;
  authToken: string | null;
  platformFromNumber: string | null;
  webhookAuthToken: string | null;
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

  return {
    enabled:
      (env.TWILIO_ENABLED ?? 'false').toLowerCase() === 'true' &&
      Boolean(accountSid && authToken && platformFromNumber),
    accountSid,
    authToken,
    platformFromNumber,
    webhookAuthToken: authToken,
  };
}

export function normalizeE164Phone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('1') && digits.length === 11
    ? `+${digits}`
    : `+${digits}`;
}
