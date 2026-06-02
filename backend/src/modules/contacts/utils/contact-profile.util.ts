export function buildDisplayName(
  firstName?: string | null,
  lastName?: string | null,
): string | undefined {
  const display = [firstName?.trim(), lastName?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();
  return display || undefined;
}

export function emptyToUndefined(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function formatPhone(
  phoneCountryCode?: string | null,
  phoneNumber?: string | null,
): string | null {
  const code = phoneCountryCode?.trim();
  const digits = (phoneNumber?.trim() ?? '').replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  const dial = code || '+1';
  return `${dial}${digits}`;
}

/** Clears country code when no national digits are present. */
export function sanitizePhoneFields(
  phoneCountryCode?: string | null,
  phoneNumber?: string | null,
): { phoneCountryCode: string | null; phoneNumber: string | null } {
  const digits = (phoneNumber?.trim() ?? '').replace(/\D/g, '');
  if (!digits) {
    return { phoneCountryCode: null, phoneNumber: null };
  }
  const dial = phoneCountryCode?.trim() || '+1';
  return { phoneCountryCode: dial, phoneNumber: digits };
}

/** Normalized key for duplicate phone checks within a business. */
export function normalizePhoneKey(
  phoneCountryCode?: string | null,
  phoneNumber?: string | null,
): string | null {
  const code = phoneCountryCode?.trim() ?? '';
  const number = (phoneNumber?.trim() ?? '').replace(/\D/g, '');
  if (!number) {
    return null;
  }
  return `${code}${number}`;
}
