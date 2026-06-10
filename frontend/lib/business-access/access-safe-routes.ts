const ACCESS_SAFE_ROUTES = new Set([
  "/business/dashboard",
  "/business/settings/profile",
  "/business/settings/billing",
  "/business/access-blocked",
  "/business/feature-unavailable",
]);

export function isAccessSafeRoute(pathname: string): boolean {
  if (ACCESS_SAFE_ROUTES.has(pathname)) return true;
  return false;
}

export function getAccessSafeRoutes(): string[] {
  return Array.from(ACCESS_SAFE_ROUTES);
}
