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
  const number = phoneNumber?.trim();
  if (!code && !number) {
    return null;
  }
  if (code && number) {
    return `${code} ${number}`;
  }
  return code ?? number ?? null;
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
