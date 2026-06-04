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
