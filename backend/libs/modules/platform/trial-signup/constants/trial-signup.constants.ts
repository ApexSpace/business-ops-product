export const TRIAL_SERVICE_OPTIONS = [
  'haircut_styling',
  'facials',
  'nail_services',
  'lashes',
  'massage',
  'waxing',
  'injectables_fillers',
  'tattoos_piercing',
  'makeup',
  'barbering',
  'hair_extensions',
  'other',
] as const;

export type TrialServiceOption = (typeof TRIAL_SERVICE_OPTIONS)[number];

export const TRIAL_PROVIDER_COUNT_BANDS = [
  '1',
  '2-4',
  '5-15',
  '16+',
] as const;

export type TrialProviderCountBand =
  (typeof TRIAL_PROVIDER_COUNT_BANDS)[number];

export const TRIAL_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const TRIAL_OTP_TTL_SEC = 10 * 60;
export const TRIAL_PHONE_TOKEN_TTL = '30m';
export const TRIAL_HANDOFF_TTL_SEC = 2 * 60;
export const TRIAL_RATE_WINDOW_SEC = 15 * 60;

export const TRIAL_SEND_OTP_LIMITS = {
  perPhone: 3,
  perIp: 10,
  perSession: 5,
} as const;

export const TRIAL_VERIFY_OTP_LIMITS = {
  perPhone: 10,
  perIp: 10,
} as const;

export const TRIAL_COMPLETE_LIMITS = {
  perIp: 10,
  perSession: 10,
} as const;

export type TrialSignupPayload = {
  servicesOffered?: TrialServiceOption[];
  providerCountBand?: TrialProviderCountBand;
  firstName?: string;
  lastName?: string;
  email?: string;
  businessName?: string;
  website?: string | null;
  phoneE164?: string;
};
