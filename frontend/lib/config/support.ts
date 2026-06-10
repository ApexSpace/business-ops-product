export const supportConfig = {
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@codesoltech.com",
  url: process.env.NEXT_PUBLIC_SUPPORT_URL ?? null,
  bookCallUrl: process.env.NEXT_PUBLIC_BOOK_CALL_URL ?? null,
};

export function getSupportMailto(subject?: string): string {
  const base = `mailto:${supportConfig.email}`;
  if (!subject) return base;
  return `${base}?subject=${encodeURIComponent(subject)}`;
}

export function getSupportHref(): string {
  return supportConfig.url ?? getSupportMailto();
}

export function getBookCallHref(): string | null {
  return supportConfig.bookCallUrl;
}
