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

/** Lowercase underscore slug for stable capability keys (e.g. "WhatsApp CRM" → whatsapp_crm). */
export function underscoreSlugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function withUnderscoreSuffix(base: string, suffix: number): string {
  return suffix <= 1 ? base : `${base}_${suffix}`;
}
