export type RouteCapabilityEntry = {
  moduleKey: string;
  capabilityKeys: string[];
};

const ROUTE_CAPABILITY_MAP = new Map<string, RouteCapabilityEntry>([
  ["/business/contacts", { moduleKey: "contacts", capabilityKeys: ["contacts.list"] }],
  ["/business/leads", { moduleKey: "pipelines", capabilityKeys: ["pipelines.list", "leads.list"] }],
  ["/business/pipelines", { moduleKey: "pipelines", capabilityKeys: ["pipelines.list"] }],
  ["/business/notes", { moduleKey: "notes", capabilityKeys: ["notes.list"] }],
  ["/business/work-items", { moduleKey: "work_items", capabilityKeys: ["work_items.list"] }],
  [
    "/business/social-planner",
    { moduleKey: "social_planner", capabilityKeys: ["social_planner.list"] },
  ],
  ["/business/tasks", { moduleKey: "tasks", capabilityKeys: ["tasks.list"] }],
  [
    "/business/conversations",
    { moduleKey: "conversations", capabilityKeys: ["conversations.inbox"] },
  ],
  [
    "/business/appointments",
    { moduleKey: "appointments", capabilityKeys: ["appointments.list"] },
  ],
  [
    "/business/time-clock",
    { moduleKey: "time_clock", capabilityKeys: ["time_clock.kiosk"] },
  ],
  [
    "/business/time-cards",
    { moduleKey: "time_clock", capabilityKeys: ["time_clock.cards.manage"] },
  ],
  [
    "/business/payments",
    {
      moduleKey: "payments",
      capabilityKeys: [
        "payments.transactions.list",
        "estimates.list",
        "invoices.list",
      ],
    },
  ],
  ["/business/sales", { moduleKey: "sales", capabilityKeys: ["sales.access"] }],
  [
    "/business/gift-cards",
    { moduleKey: "gift_cards", capabilityKeys: ["gift_cards.list"] },
  ],
  [
    "/business/packages",
    { moduleKey: "packages", capabilityKeys: ["packages.list"] },
  ],
  [
    "/business/memberships",
    { moduleKey: "memberships", capabilityKeys: ["memberships.list"] },
  ],
  ["/business/offers", { moduleKey: "offers", capabilityKeys: ["offers.list"] }],
  [
    "/business/products",
    { moduleKey: "products", capabilityKeys: ["products.list"] },
  ],
  [
    "/business/reports",
    { moduleKey: "reports", capabilityKeys: ["reports.access"] },
  ],
  [
    "/business/invoices",
    { moduleKey: "invoices", capabilityKeys: ["invoices.list"] },
  ],
  [
    "/business/estimates",
    { moduleKey: "estimates", capabilityKeys: ["estimates.list"] },
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
    "/business/settings/web-chat",
    { moduleKey: "ai_agents", capabilityKeys: ["ai_agents.list"] },
  ],
  [
    "/business/settings/scheduling-options",
    { moduleKey: "calendar", capabilityKeys: ["calendar.list"] },
  ],
  [
    "/business/settings/waiting-room",
    { moduleKey: "appointments", capabilityKeys: ["appointments.access"] },
  ],
  [
    "/business/settings/forms",
    { moduleKey: "forms", capabilityKeys: ["forms.list"] },
  ],
  [
    "/business/settings/automations",
    { moduleKey: "automations", capabilityKeys: ["automations.list"] },
  ],
  [
    "/business/settings/automation-workflows",
    { moduleKey: "automations", capabilityKeys: ["automations.list"] },
  ],
  [
    "/business/settings/automation-registry",
    { moduleKey: "automations", capabilityKeys: ["automations.list"] },
  ],
  [
    "/business/automations",
    { moduleKey: "automations", capabilityKeys: ["automations.list"] },
  ],
  [
    "/business/settings/services",
    { moduleKey: "services", capabilityKeys: ["services.list"] },
  ],
  [
    "/business/settings/resources",
    { moduleKey: "resources", capabilityKeys: ["resources.list"] },
  ],
  [
    "/business/settings/online-booking",
    { moduleKey: "online_booking", capabilityKeys: ["online_booking.settings"] },
  ],
  [
    "/business/settings/integrations",
    { moduleKey: "settings", capabilityKeys: ["settings.integrations"] },
  ],
  [
    "/business/settings/whatsapp",
    {
      moduleKey: "conversations",
      capabilityKeys: [
        "conversations.inbox",
        "settings.integrations.whatsapp",
      ],
    },
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

function hasModuleInKeys(
  capabilityKeys: Set<string>,
  moduleKey: string,
): boolean {
  if (capabilityKeys.has(moduleKey)) {
    return true;
  }
  const prefix = `${moduleKey}.`;
  for (const key of capabilityKeys) {
    if (key.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

export function hasModuleForRoute(
  route: string,
  capabilityKeys: Set<string>,
): boolean {
  const entry = getRouteCapabilityEntry(route);
  if (!entry) return true;

  if (entry.capabilityKeys.some((key) => capabilityKeys.has(key))) {
    return true;
  }

  const moduleKeys = new Set<string>([entry.moduleKey]);
  for (const key of entry.capabilityKeys) {
    const moduleFromKey = key.split(".")[0];
    if (moduleFromKey) moduleKeys.add(moduleFromKey);
  }

  for (const moduleKey of moduleKeys) {
    if (capabilityKeys.has(moduleKey)) return true;
    const prefix = `${moduleKey}.`;
    for (const key of capabilityKeys) {
      if (key.startsWith(prefix)) return true;
    }
  }

  return false;
}

/** Nav/route gate aligned with registry feature keys (not permission keys). */
export function canAccessBusinessRoute(
  route: string,
  capabilityKeys: Set<string>,
): boolean {
  if (route === "/business/settings/whatsapp") {
    return (
      hasModuleInKeys(capabilityKeys, "conversations") &&
      (capabilityKeys.has("settings.integrations.whatsapp") ||
        capabilityKeys.has("settings.integrations"))
    );
  }

  return hasModuleForRoute(route, capabilityKeys);
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
