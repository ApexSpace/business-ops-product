/**
 * Public route registry — single source of truth for unauthenticated frontend paths.
 *
 * Add new public resource types here (prefix + optional legacy aliases).
 * Do not edit proxy.ts when introducing a new public page family.
 *
 * Pattern: each resource exposes a canonical prefix; legacy paths stay listed
 * until callers migrate to the canonical URL.
 */

export type PublicRouteResource = {
  /** Canonical URL prefix, e.g. `/invoice` for `/invoice/:token`. */
  prefix: string;
  /** Previous paths that must remain public without auth. */
  legacyPrefixes?: string[];
  description: string;
};

/**
 * Registered public resource families. Order does not matter for matching.
 */
export const PUBLIC_ROUTE_RESOURCES: PublicRouteResource[] = [
  {
    prefix: "/book",
    description: "Public calendar booking",
  },
  {
    prefix: "/calendar",
    legacyPrefixes: ["/embed"],
    description: "Public calendar booking (canonical + embed widget)",
  },
  {
    prefix: "/invoice",
    legacyPrefixes: ["/pay"],
    description: "Public invoice view and payment",
  },
  {
    prefix: "/payment",
    description: "Public payment links (aliases invoice token routes)",
  },
  {
    prefix: "/estimate",
    description: "Public estimate view (token-based)",
  },
  {
    prefix: "/chat",
    description: "Public chatbot full-page experience",
  },
  {
    prefix: "/widget",
    description: "Embeddable public widgets (chatbot, forms)",
  },
  {
    prefix: "/form",
    description: "Public form submissions",
  },
  {
    prefix: "/public",
    description: "Generic public pages and assets",
  },
];

/** Auth flows that never require a session. */
export const PUBLIC_AUTH_PATHS = ["/login", "/select-context"] as const;

/** OAuth and other callback flows that must work logged out. */
export const PUBLIC_CALLBACK_PATHS = ["/oauth"] as const;

/** API routes handled by Next route handlers (not page auth). */
export const PUBLIC_API_PATH_PREFIXES = [
  "/api/auth/login",
  "/api/auth/refresh",
] as const;

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const withoutTrailing = pathname.replace(/\/+$/, "") || "/";
  return withoutTrailing;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function collectPrefixes(resource: PublicRouteResource): string[] {
  return [resource.prefix, ...(resource.legacyPrefixes ?? [])];
}

/** All path prefixes that bypass session checks in proxy.ts. */
export function getPublicPathPrefixes(): string[] {
  const fromResources = PUBLIC_ROUTE_RESOURCES.flatMap(collectPrefixes);
  return [
    ...PUBLIC_AUTH_PATHS,
    ...PUBLIC_CALLBACK_PATHS,
    ...fromResources,
  ];
}

/**
 * Returns true when the pathname is a public page or callback (no login redirect).
 */
export function isPublicPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);

  if (
    PUBLIC_API_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return true;
  }

  return getPublicPathPrefixes().some((prefix) =>
    matchesPrefix(normalized, prefix),
  );
}

/**
 * Protected app areas that require authentication and context checks.
 * Everything not matched by {@link isPublicPath} (except static assets and /api)
 * is treated as protected.
 */
export const PROTECTED_ROUTE_PREFIXES = [
  "/business",
  "/platform",
  "/settings",
  "/contacts",
  "/conversations",
  "/pipelines",
  "/work-items",
  "/integrations",
  "/dashboard",
] as const;

export function isExplicitlyProtectedPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return PROTECTED_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(normalized, prefix),
  );
}
