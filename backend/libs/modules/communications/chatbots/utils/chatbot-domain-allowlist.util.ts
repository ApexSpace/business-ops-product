export function extractHostname(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^\*\./, '');
}

export function isChatbotDomainAllowed(
  allowedDomains: string[],
  pageUrl?: string | null,
  referrer?: string | null,
): boolean {
  const normalized = allowedDomains
    .map(normalizeDomain)
    .filter((domain) => domain.length > 0);

  if (normalized.length === 0) {
    return true;
  }

  const host = extractHostname(pageUrl) ?? extractHostname(referrer) ?? null;

  if (!host) {
    return false;
  }

  return normalized.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}
