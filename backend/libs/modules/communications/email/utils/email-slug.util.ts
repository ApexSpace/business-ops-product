const SLUG_MAX_LENGTH = 30;

/** "Acme Plumbing & Heating" → "acmeplumbingheating" */
export function slugifyBusinessName(businessName: string): string {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, SLUG_MAX_LENGTH);

  return base || 'business';
}

export function buildPlatformFromAddress(slug: string, sendingDomain: string): string {
  return `${slug}@${sendingDomain}`;
}
