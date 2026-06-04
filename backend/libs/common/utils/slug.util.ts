export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function withSlugSuffix(base: string, suffix: number): string {
  return suffix <= 1 ? base : `${base}-${suffix}`;
}
