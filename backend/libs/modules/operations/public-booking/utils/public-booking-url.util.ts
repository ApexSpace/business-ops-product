export function buildPublicBookingUrl(
  frontendUrl: string,
  publicSlug: string,
): string {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/book/${publicSlug}`;
}

export function buildPublicEmbedUrl(
  frontendUrl: string,
  publicSlug: string,
): string {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/embed/calendar/${publicSlug}`;
}

export function buildPublicEmbedCode(
  frontendUrl: string,
  publicSlug: string,
): string {
  const src = buildPublicEmbedUrl(frontendUrl, publicSlug);
  return `<iframe
  src="${src}"
  width="100%"
  height="750"
  style="border:0;border-radius:12px;"
  loading="lazy">
</iframe>`;
}
