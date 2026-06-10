import { phoneCountryCodeOptions } from "@/lib/config/geo-options";

export interface PhoneCountry {
  dialCode: string;
  flag: string;
  label: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "+1": "🇺🇸",
  "+44": "🇬🇧",
  "+61": "🇦🇺",
  "+91": "🇮🇳",
  "+92": "🇵🇰",
  "+971": "🇦🇪",
  "+966": "🇸🇦",
  "+49": "🇩🇪",
  "+33": "🇫🇷",
  "+81": "🇯🇵",
  "+86": "🇨🇳",
  "+55": "🇧🇷",
  "+52": "🇲🇽",
};

export const PHONE_COUNTRIES: PhoneCountry[] = phoneCountryCodeOptions
  .filter((opt): opt is typeof opt & { value: string } => Boolean(opt.value))
  .map((opt) => ({
    dialCode: opt.value,
    flag: COUNTRY_FLAGS[opt.value] ?? "🌐",
    label: opt.label,
  }));

export const DEFAULT_PHONE_DIAL_CODE = "+1";

const DIAL_CODES_BY_LENGTH = [...PHONE_COUNTRIES]
  .map((c) => c.dialCode)
  .sort((a, b) => b.length - a.length);

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function hasPhoneDigits(value?: string | null): boolean {
  return digitsOnly(value ?? "").length > 0;
}

/** Build E.164 value from dial code and national digits. Returns null if no national digits. */
export function toE164Phone(
  dialCode: string,
  nationalNumber: string,
): string | null {
  const digits = digitsOnly(nationalNumber);
  if (!digits) {
    return null;
  }
  const code = dialCode.trim() || DEFAULT_PHONE_DIAL_CODE;
  return `${code}${digits}`;
}

export function parseE164Phone(
  value?: string | null,
): { dialCode: string; nationalDigits: string } | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.startsWith("+") ? raw : `+${digitsOnly(raw)}`;
  if (normalized === "+") {
    return null;
  }

  for (const dialCode of DIAL_CODES_BY_LENGTH) {
    if (normalized.startsWith(dialCode)) {
      const nationalDigits = digitsOnly(normalized.slice(dialCode.length));
      if (!nationalDigits) {
        return { dialCode, nationalDigits: "" };
      }
      return { dialCode, nationalDigits };
    }
  }

  const fallbackDigits = digitsOnly(normalized);
  if (!fallbackDigits) {
    return null;
  }
  return { dialCode: DEFAULT_PHONE_DIAL_CODE, nationalDigits: fallbackDigits };
}

/** Map API split fields / display phone to a single form value (E.164 or empty). */
export function apiPhoneToFormValue(
  phone?: string | null,
  phoneCountryCode?: string | null,
  phoneNumber?: string | null,
): string {
  const fromE164 = parseE164Phone(phone);
  if (fromE164?.nationalDigits) {
    return toE164Phone(fromE164.dialCode, fromE164.nationalDigits) ?? "";
  }

  const nationalDigits = digitsOnly(phoneNumber ?? "");
  if (!nationalDigits) {
    return "";
  }

  const dialCode = phoneCountryCode?.trim() || DEFAULT_PHONE_DIAL_CODE;
  return toE164Phone(dialCode, nationalDigits) ?? "";
}

/** Split unified phone for API payloads. Clears both when no national digits. */
export function phoneToApiFields(phone?: string | null): {
  phoneCountryCode: string | null;
  phoneNumber: string | null;
} {
  const parsed = parseE164Phone(phone);
  if (!parsed?.nationalDigits) {
    return { phoneCountryCode: null, phoneNumber: null };
  }
  return {
    phoneCountryCode: parsed.dialCode,
    phoneNumber: parsed.nationalDigits,
  };
}

export function formatPhoneDisplay(value?: string | null): string {
  const parsed = parseE164Phone(value);
  if (!parsed?.nationalDigits) {
    return "";
  }
  return toE164Phone(parsed.dialCode, parsed.nationalDigits) ?? "";
}

export function getPhoneCountry(dialCode: string): PhoneCountry {
  return (
    PHONE_COUNTRIES.find((c) => c.dialCode === dialCode) ?? {
      dialCode: DEFAULT_PHONE_DIAL_CODE,
      flag: COUNTRY_FLAGS[DEFAULT_PHONE_DIAL_CODE],
      label: "US / Canada (+1)",
    }
  );
}
