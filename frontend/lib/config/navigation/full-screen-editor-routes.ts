type RouteMatcher = string | RegExp;

export interface FullScreenEditorRoute {
  /** Stable id for debugging and feature-specific checks. */
  id: string;
  matcher: RouteMatcher;
}

/**
 * Routes that render without app sidebar/topbar in a focused full-screen editor.
 * Add future CRUD editors (chatbot, automation, funnel, email, workflow) here.
 */
export const FULL_SCREEN_EDITOR_ROUTES: FullScreenEditorRoute[] = [
  { id: "forms-create", matcher: "/business/settings/forms/new" },
  {
    id: "forms-edit",
    matcher: /^\/business\/settings\/forms\/[^/]+\/edit$/,
  },
];

function normalizePathname(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function matchesRoute(pathname: string, matcher: RouteMatcher): boolean {
  const normalized = normalizePathname(pathname);
  if (typeof matcher === "string") {
    return normalized === matcher;
  }
  return matcher.test(normalized);
}

export function isFullScreenEditorRoute(pathname: string): boolean {
  return FULL_SCREEN_EDITOR_ROUTES.some((route) =>
    matchesRoute(pathname, route.matcher),
  );
}

export function isFormsBuilderRoute(pathname: string): boolean {
  return FULL_SCREEN_EDITOR_ROUTES.filter((route) =>
    route.id.startsWith("forms-"),
  ).some((route) => matchesRoute(pathname, route.matcher));
}
