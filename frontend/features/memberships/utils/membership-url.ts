export function resolvePublicMembershipCatalogUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/memberships/${slug}`;
  }
  return `/memberships/${slug}`;
}

export function resolvePublicMembershipDirectUrl(
  slug: string,
  planId: string,
): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/memberships/${slug}/${planId}`;
  }
  return `/memberships/${slug}/${planId}`;
}

export function resolvePublicMembershipUrl(slug: string, planId?: string) {
  const base = resolvePublicMembershipCatalogUrl(slug);
  return planId ? resolvePublicMembershipDirectUrl(slug, planId) : base;
}

export function formatBillingInterval(
  count: number,
  unit: "WEEK" | "MONTH" | "YEAR",
): string {
  const label =
    unit === "WEEK" ? "week" : unit === "MONTH" ? "month" : "year";
  const plural = count === 1 ? label : `${label}s`;
  return count === 1 ? `per ${label}` : `every ${count} ${plural}`;
}

export function formatMembershipPrice(
  price: string,
  count: number,
  unit: "WEEK" | "MONTH" | "YEAR",
): string {
  return `$${price} ${formatBillingInterval(count, unit)}`;
}
