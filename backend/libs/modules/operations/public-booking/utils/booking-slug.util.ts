const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyBookingSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function isValidBookingSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 80 && SLUG_PATTERN.test(slug);
}

export function getBookingSlugFromWidgetSettings(
  widgetSettings: unknown,
): string | null {
  if (!widgetSettings || typeof widgetSettings !== 'object') return null;
  const slug = (widgetSettings as Record<string, unknown>).bookingSlug;
  if (typeof slug !== 'string') return null;
  const trimmed = slug.trim();
  return trimmed.length > 0 ? slugifyBookingSlug(trimmed) : null;
}
