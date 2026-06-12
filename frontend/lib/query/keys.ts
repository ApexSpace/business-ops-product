/**
 * Centralized React Query keys for consistent caching and invalidation.
 */

export type ListFilters = Record<
  string,
  string | number | boolean | undefined | null
>;

function listKey(
  base: readonly string[],
  filters?: ListFilters,
): readonly (string | number)[] {
  if (!filters) return base;
  const parts: (string | number)[] = [...base];
  const keys = Object.keys(filters).sort();
  for (const key of keys) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean") {
      parts.push(key, value ? "true" : "false");
    } else {
      parts.push(key, value);
    }
  }
  return parts;
}

export const queryKeys = {
  auth: {
    session: () => ["auth", "session"] as const,
  },
  business: {
    current: () => ["business", "current"] as const,
    access: () => ["business", "access"] as const,
    snapshotContext: (businessId: string) =>
      ["business", businessId, "snapshot-context"] as const,
    financialSettings: () => ["business", "financial-settings"] as const,
    members: (filters?: { page?: number; limit?: number; search?: string }) =>
      listKey(["business", "members"], filters),
    dashboardStats: () => ["business", "dashboard-stats"] as const,
  },
  services: {
    all: () => ["services"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }) => listKey(["services", "list"], filters),
    picker: () => ["services", "picker"] as const,
    detail: (id: string) => ["services", "detail", id] as const,
  },
  contacts: {
    all: () => ["contacts"] as const,
    list: (filters: { page?: number; limit?: number; search?: string }) =>
      listKey(["contacts", "list"], filters),
    search: (term: string) => ["contacts", "search", term] as const,
    picker: () => ["contacts", "picker"] as const,
    detail: (id: string) => ["contacts", "detail", id] as const,
  },
  workItems: {
    all: () => ["work-items"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      serviceId?: string;
      contactId?: string;
      assignedToId?: string;
    }) => listKey(["work-items", "list"], filters),
    detail: (id: string) => ["work-items", "detail", id] as const,
  },
  notes: {
    all: () => ["notes"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      contactId?: string;
      leadId?: string;
    }) => listKey(["notes", "list"], filters),
    detail: (id: string) => ["notes", "detail", id] as const,
  },
  tasks: {
    all: () => ["tasks"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      contactId?: string;
      leadId?: string;
      assignedToId?: string;
      status?: string;
      priority?: string;
      dueFrom?: string;
      dueTo?: string;
    }) => listKey(["tasks", "list"], filters),
    detail: (id: string) => ["tasks", "detail", id] as const,
  },
  invoices: {
    all: () => ["invoices"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      contactId?: string;
      status?: string;
      issueFrom?: string;
      issueTo?: string;
    }) => listKey(["invoices", "list"], filters),
    detail: (id: string) => ["invoices", "detail", id] as const,
  },
  payments: {
    all: () => ["payments"] as const,
    overview: () => ["payments", "overview"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      invoiceId?: string;
      contactId?: string;
      method?: string;
      paidFrom?: string;
      paidTo?: string;
    }) => listKey(["payments", "list"], filters),
    detail: (id: string) => ["payments", "detail", id] as const,
  },
  estimates: {
    all: () => ["estimates"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      contactId?: string;
      status?: string;
      issueFrom?: string;
      issueTo?: string;
    }) => listKey(["estimates", "list"], filters),
    detail: (id: string) => ["estimates", "detail", id] as const,
  },
  leads: {
    all: () => ["leads"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      pipelineId?: string;
      pipelineStageId?: string;
      status?: string;
      contactId?: string;
    }) => listKey(["leads", "list"], filters),
    pipeline: (pipelineId: string) =>
      ["leads", "pipeline", pipelineId] as const,
    detail: (id: string) => ["leads", "detail", id] as const,
  },
  pipelines: {
    all: () => ["pipelines"] as const,
    list: () => ["pipelines", "list"] as const,
    detail: (id: string) => ["pipelines", "detail", id] as const,
  },
  industries: {
    active: () => ["industries", "active"] as const,
  },
  calendars: {
    all: () => ["calendars"] as const,
    list: (filters?: { page?: number; limit?: number; search?: string; status?: string }) =>
      listKey(["calendars", "list"], filters),
    detail: (id: string) => ["calendars", "detail", id] as const,
    exceptions: (id: string) => ["calendars", "exceptions", id] as const,
    googleSyncStatus: (id: string) => ["calendars", "google-sync-status", id] as const,
  },
  chatbots: {
    all: () => ["chatbots"] as const,
    list: () => ["chatbots", "list"] as const,
    detail: (id: string) => ["chatbots", "detail", id] as const,
    rules: (id: string) => ["chatbots", id, "rules"] as const,
    embed: (id: string) => ["chatbots", id, "embed"] as const,
  },
  forms: {
    all: () => ["forms"] as const,
    list: (filters?: {
      search?: string;
      status?: string;
      sort?: string;
      sortDir?: string;
    }) => listKey(["forms", "list"], filters),
    detail: (id: string) => ["forms", "detail", id] as const,
    embed: (id: string) => ["forms", "embed", id] as const,
    submissions: (formId: string, filters?: { page?: number; limit?: number }) =>
      listKey(["forms", formId, "submissions"], filters),
  },
  emailNotifications: {
    all: () => ["email-notifications"] as const,
    preferences: () => ["email-notifications", "preferences"] as const,
    templates: () => ["email-notifications", "templates"] as const,
    template: (emailType: string) =>
      ["email-notifications", "template", emailType] as const,
    logs: (filters?: ListFilters) =>
      listKey(["email-notifications", "logs"], filters),
  },
  conversations: {
    all: () => ["conversations"] as const,
    list: (filters?: Record<string, string | number | undefined | null>) =>
      listKey(["conversations", "list"], filters),
    detail: (id: string) => ["conversations", "detail", id] as const,
    messages: (id: string, page?: number) =>
      ["conversations", id, "messages", page ?? 1] as const,
    byContact: (contactId: string) =>
      ["conversations", "by-contact", contactId] as const,
  },
  appointments: {
    all: () => ["appointments"] as const,
    list: (filters?: Record<string, string | number | undefined | null>) =>
      listKey(["appointments", "list"], filters),
    detail: (id: string) => ["appointments", "detail", id] as const,
  },
  integrations: {
    all: () => ["integrations"] as const,
    businessProviders: () => ["integrations", "business", "providers"] as const,
    businessList: () => ["integrations", "business", "list"] as const,
    businessDetail: (providerKey: string) =>
      ["integrations", "business", "detail", providerKey] as const,
    businessResources: (providerKey: string) =>
      ["integrations", "business", "resources", providerKey] as const,
    messagingStatus: (providerKey: string) =>
      ["integrations", "business", "messaging-status", providerKey] as const,
    platformEmail: () => ["integrations", "business", "platform-email"] as const,
    platformProviders: () => ["integrations", "platform", "providers"] as const,
    platformList: () => ["integrations", "platform", "list"] as const,
    platformDetail: (providerKey: string) =>
      ["integrations", "platform", "detail", providerKey] as const,
  },
  platform: {
    businesses: {
      all: () => ["platform", "businesses"] as const,
      list: (filters: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        subscriptionStatus?: string;
        paymentStatus?: string;
      }) => listKey(["platform", "businesses", "list"], filters),
      detail: (id: string) => ["platform", "business", id] as const,
      access: (id: string) => ["platform", "business", id, "access"] as const,
      subscriptionEvents: (
        id: string,
        filters?: ListFilters,
      ) => listKey(["platform", "business", id, "subscription-events"], filters),
      subscriptionEvent: (businessId: string, eventId: string) =>
        ["platform", "business", businessId, "subscription-events", eventId] as const,
      subscriptionPayments: (
        id: string,
        filters?: ListFilters,
      ) => listKey(["platform", "business", id, "subscription-payments"], filters),
      capabilities: (id: string) =>
        ["platform", "business", id, "capabilities"] as const,
      utilization: (id: string) =>
        ["platform", "business", id, "utilization"] as const,
      members: (id: string) => ["platform", "business", id, "members"] as const,
      audit: (
        id: string,
        filters?: { page?: number; limit?: number; action?: string },
      ) => listKey(["platform", "business", id, "audit"], filters),
    },
    auditLogs: {
      all: () => ["platform", "audit-logs"] as const,
      list: (filters: { page?: number; limit?: number; search?: string }) =>
        listKey(["platform", "audit-logs", "list"], filters),
    },
    users: {
      all: () => ["platform", "users"] as const,
      list: (filters: { page?: number; limit?: number; role?: string }) =>
        listKey(["platform", "users", "list"], filters),
    },
    industries: {
      all: () => ["platform", "industries"] as const,
      list: (filters: { page?: number; limit?: number; status?: string }) =>
        listKey(["platform", "industries", "list"], filters),
      detail: (id: string) => ["platform", "industries", id] as const,
    },
    snapshots: {
      all: () => ["platform", "snapshots"] as const,
      list: (filters: { page?: number; limit?: number; status?: string }) =>
        listKey(["platform", "snapshots", "list"], filters),
      detail: (id: string) => ["platform", "snapshots", id] as const,
    },
    planGroups: {
      all: () => ["platform", "plan-groups"] as const,
      stats: () => ["platform", "plan-groups", "stats"] as const,
      list: (filters: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
      }) => listKey(["platform", "plan-groups", "list"], filters),
      detail: (id: string) => ["platform", "plan-groups", id] as const,
      tiers: (id: string) => ["platform", "plan-groups", id, "tiers"] as const,
      tierDefaults: (groupId: string, tierId: string) =>
        ["platform", "plan-groups", groupId, "tiers", tierId, "defaults"] as const,
      groupDefaults: (id: string) =>
        ["platform", "plan-groups", id, "defaults"] as const,
      featureRows: (id: string) =>
        ["platform", "plan-groups", id, "feature-rows"] as const,
      embed: (id: string) => ["platform", "plan-groups", id, "embed"] as const,
      preview: (id: string) => ["platform", "plan-groups", id, "preview"] as const,
      activeCapabilities: (snapshotId?: string | null) =>
        [
          "platform",
          "plan-groups",
          "active-capabilities",
          snapshotId ?? "none",
        ] as const,
    },
    capabilities: {
      all: () => ["platform", "capabilities"] as const,
      stats: () => ["platform", "capabilities", "stats"] as const,
      list: (filters: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
      }) => listKey(["platform", "capabilities", "list"], filters),
      detail: (id: string) => ["platform", "capabilities", id] as const,
      globalRegistry: () =>
        ["platform", "capabilities", "registry"] as const,
      registryModules: () =>
        ["platform", "capabilities", "registry", "modules"] as const,
      availableFeatures: (id: string) =>
        ["platform", "capabilities", id, "available-features"] as const,
      modules: (id: string) =>
        ["platform", "capabilities", id, "modules"] as const,
      features: (id: string) =>
        ["platform", "capabilities", id, "features"] as const,
      permissions: (id: string) =>
        ["platform", "capabilities", id, "permissions"] as const,
      limits: (id: string) =>
        ["platform", "capabilities", id, "limits"] as const,
      navigation: (id: string) =>
        ["platform", "capabilities", id, "navigation"] as const,
      configSchemas: (id: string) =>
        ["platform", "capabilities", id, "config-schemas"] as const,
    },
    settings: () => ["platform", "settings"] as const,
    dashboard: {
      stats: () => ["platform", "dashboard", "stats"] as const,
    },
  },
} as const;
