export function resolvePublicPackageCatalogUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/packages/${slug}`;
  }
  return `/packages/${slug}`;
}

export function resolvePublicPackageDirectUrl(
  slug: string,
  templateId: string,
): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/packages/${slug}/${templateId}`;
  }
  return `/packages/${slug}/${templateId}`;
}
