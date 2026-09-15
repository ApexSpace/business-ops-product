export const TRIAL_SERVICE_OPTIONS = [
  { value: "haircut_styling", label: "Haircut & styling" },
  { value: "facials", label: "Facials" },
  { value: "nail_services", label: "Nail services" },
  { value: "lashes", label: "Lashes" },
  { value: "massage", label: "Massage" },
  { value: "waxing", label: "Waxing" },
  { value: "injectables_fillers", label: "Injectables & fillers" },
  { value: "tattoos_piercing", label: "Tattoos & piercing" },
  { value: "makeup", label: "Makeup" },
  { value: "barbering", label: "Barbering" },
  { value: "hair_extensions", label: "Hair extensions" },
  { value: "other", label: "Other" },
] as const;

export const TRIAL_PROVIDER_BANDS = [
  { value: "1", label: "1 Provider", dots: 1 },
  { value: "2-4", label: "2–4 Providers", dots: 3 },
  { value: "5-15", label: "5–15 Providers", dots: 6 },
  { value: "16+", label: "16+ Providers", dots: 12 },
] as const;

export type TrialServiceValue =
  (typeof TRIAL_SERVICE_OPTIONS)[number]["value"];
export type TrialProviderBand =
  (typeof TRIAL_PROVIDER_BANDS)[number]["value"];

export type TrialWizardState = {
  sessionId: string | null;
  servicesOffered: TrialServiceValue[];
  providerCountBand: TrialProviderBand | null;
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  website: string;
  phoneE164: string;
  phoneVerificationToken: string | null;
};
