/**
 * US-only NANP helpers for Twilio local number auto-assignment.
 */

const US_COUNTRY_CODES = new Set(['+1', '1', 'US', 'USA', 'us', 'usa']);

export function isUsPhoneCountryCode(
  phoneCountryCode: string | null | undefined,
): boolean {
  if (!phoneCountryCode) return false;
  const normalized = phoneCountryCode.trim();
  return US_COUNTRY_CODES.has(normalized);
}

/**
 * Extract 3-digit NANP area code from a US national or E.164 phone string.
 * Returns null when the number is not a usable 10/11-digit NANP value.
 */
export function extractNanpAreaCode(
  phoneNumber: string | null | undefined,
): string | null {
  if (!phoneNumber) return null;
  let digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) return null;
  const areaCode = digits.slice(0, 3);
  if (!/^[2-9]\d{2}$/.test(areaCode)) return null;
  return areaCode;
}

export function resolveRequestedUsAreaCode(params: {
  phoneCountryCode: string | null | undefined;
  phoneNumber: string | null | undefined;
  defaultAreaCode: string | null | undefined;
}): { isUs: boolean; areaCode: string | null } {
  const isUs = isUsPhoneCountryCode(params.phoneCountryCode);
  if (!isUs) {
    return { isUs: false, areaCode: null };
  }

  const fromPhone = extractNanpAreaCode(params.phoneNumber);
  if (fromPhone) {
    return { isUs: true, areaCode: fromPhone };
  }

  const fallback = params.defaultAreaCode?.replace(/\D/g, '') ?? '';
  if (/^[2-9]\d{2}$/.test(fallback)) {
    return { isUs: true, areaCode: fallback };
  }

  return { isUs: true, areaCode: null };
}
