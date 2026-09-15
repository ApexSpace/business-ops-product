/**
 * Build a stable public CDN URL for an R2 object key.
 * Strips trailing slashes on the base and leading slashes on the key.
 */
export function buildPublicObjectUrl(
  publicBaseUrl: string,
  objectKey: string,
): string {
  const base = publicBaseUrl.replace(/\/+$/, '');
  const key = objectKey.replace(/^\/+/, '');
  return `${base}/${key}`;
}
