export function buildPublicBookingUrl(
  frontendUrl: string,
  publicSlug: string,
): string {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/book/${publicSlug}`;
}

export function buildPublicServiceBookingUrl(
  frontendUrl: string,
  publicSlug: string,
  params: { serviceId: string; staffId?: string },
): string {
  const base = buildPublicBookingUrl(frontendUrl, publicSlug);
  const search = new URLSearchParams({ serviceId: params.serviceId });
  if (params.staffId) {
    search.set('staffId', params.staffId);
  }
  return `${base}?${search.toString()}`;
}

export function buildPublicStaffBookingUrl(
  frontendUrl: string,
  publicSlug: string,
  staffId: string,
): string {
  const base = buildPublicBookingUrl(frontendUrl, publicSlug);
  return `${base}?staffId=${encodeURIComponent(staffId)}`;
}

export function buildPublicEmbedUrl(
  frontendUrl: string,
  publicSlug: string,
): string {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/embed/booking/${publicSlug}`;
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
