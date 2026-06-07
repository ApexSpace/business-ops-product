export function resolvePublicBookingUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/book/${slug}`;
  }
  return `/book/${slug}`;
}

export function resolvePublicEmbedUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/embed/calendar/${slug}`;
  }
  return `/embed/calendar/${slug}`;
}

export function buildEmbedCode(slug: string): string {
  const src = resolvePublicEmbedUrl(slug);
  return `<iframe
  src="${src}"
  width="100%"
  height="680"
  style="border:0;border-radius:12px;min-height:640px;max-width:100%;"
  loading="lazy"
  title="Book an appointment">
</iframe>`;
}
