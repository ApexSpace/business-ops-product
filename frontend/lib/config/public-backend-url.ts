/**
 * Public NestJS origin for embed iframe + JSON pricing URLs in the browser.
 * Set `BACKEND_URL` in frontend/.env (mapped via next.config) or override with
 * `NEXT_PUBLIC_BACKEND_URL` when the public origin differs from the API proxy target.
 */
export function getPublicBackendUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

export function getPricingEmbedCode(id: string): string | null {
  const base = getPublicBackendUrl();
  if (!base) return null;
  return `<script type="text/javascript" src="${base}/embed/pricing-widget.js"></script>
<iframe class="plan-pricing-widget" src="${base}/embed/pricing/${id}" frameborder="0" scrolling="no" style="min-width:100%;width:100%;border:0;" loading="lazy"></iframe>`;
}

export function getPricingJsonUrl(id: string): string | null {
  const base = getPublicBackendUrl();
  if (!base) return null;
  return `${base}/public/pricing/${id}`;
}
