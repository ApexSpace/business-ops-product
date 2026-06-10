export type RouteCapabilityEntry = {
  moduleKey: string;
  capabilityKeys: string[];
};

const ROUTE_CAPABILITY_MAP = new Map<string, RouteCapabilityEntry>([
  ["/business/contacts", { moduleKey: "contacts", capabilityKeys: ["contacts.list"] }],
  ["/business/leads", { moduleKey: "leads", capabilityKeys: ["leads.list"] }],
  ["/business/pipelines", { moduleKey: "pipelines", capabilityKeys: ["pipelines.list"] }],
  ["/business/work-items", { moduleKey: "work_items", capabilityKeys: ["work_items.list"] }],
  [
    "/business/conversations",
    { moduleKey: "conversations", capabilityKeys: ["conversations.inbox"] },
  ],
  [
    "/business/appointments",
    { moduleKey: "appointments", capabilityKeys: ["appointments.list"] },
  ],
  [
    "/business/payments",
    { moduleKey: "payments", capabilityKeys: ["payments.estimates.list"] },
  ],
  [
    "/business/invoices",
    { moduleKey: "payments", capabilityKeys: ["payments.invoices.list"] },
  ],
  [
    "/business/estimates",
    { moduleKey: "payments", capabilityKeys: ["payments.estimates.list"] },
  ],
  [
    "/business/settings/calendars",
    { moduleKey: "calendar", capabilityKeys: ["calendar.list"] },
  ],
  [
    "/business/settings/pipelines",
    { moduleKey: "pipelines", capabilityKeys: ["pipelines.list"] },
  ],
  [
    "/business/settings/chatbots",
    { moduleKey: "ai_agents", capabilityKeys: ["ai_agents.list"] },
  ],
  [
    "/business/settings/integrations",
    { moduleKey: "settings", capabilityKeys: ["settings.integrations"] },
  ],
]);

const CORE_SAFE_PREFIXES = [
  "/business/dashboard",
  "/business/settings/profile",
  "/business/settings/billing",
  "/business/settings/team",
  "/business/settings/notifications",
  "/business/settings/appearance",
  "/business/settings/financial",
  "/business/settings/templates",
  "/business/settings/automations",
  "/business/access-blocked",
  "/business/feature-unavailable",
];

export function getRouteCapabilityEntry(
  route: string,
): RouteCapabilityEntry | undefined {
  return ROUTE_CAPABILITY_MAP.get(route);
}

export function resolveRouteCapability(
  pathname: string,
): RouteCapabilityEntry | null {
  const normalized = pathname.split("?")[0];
  const exact = ROUTE_CAPABILITY_MAP.get(normalized);
  if (exact) return exact;

  for (const [route, entry] of ROUTE_CAPABILITY_MAP.entries()) {
    if (normalized.startsWith(`${route}/`)) {
      return entry;
    }
  }

  return null;
}

export function isCoreSafeBusinessRoute(pathname: string): boolean {
  const normalized = pathname.split("?")[0];
  return CORE_SAFE_PREFIXES.some(
    (route) => normalized === route || normalized.startsWith(`${route}/`),
  );
}

export function hasModuleForRoute(
  route: string,
  capabilityKeys: Set<string>,
): boolean {
  const entry = getRouteCapabilityEntry(route);
  if (!entry) return true;
  const prefix = `${entry.moduleKey}.`;
  return (
    capabilityKeys.has(entry.moduleKey) ||
    entry.capabilityKeys.some((key) => capabilityKeys.has(key)) ||
    Array.from(capabilityKeys).some((key) => key.startsWith(prefix))
  );
}

export function getMappedRoutes(): string[] {
  return Array.from(ROUTE_CAPABILITY_MAP.keys());
}

export function warnUnmappedRoute(route: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[route-capability-map] Unmapped business route: ${route}. Nav item remains visible.`,
    );
  }
}

export function warnUnmappedBusinessRoute(pathname: string): void {
  if (process.env.NODE_ENV === "production") return;
  const normalized = pathname.split("?")[0];
  if (!normalized.startsWith("/business")) return;
  if (isCoreSafeBusinessRoute(normalized)) return;
  if (resolveRouteCapability(normalized)) return;
  warnUnmappedRoute(normalized);
}
