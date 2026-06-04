/**
 * Centralized React Query keys for consistent caching and invalidation.
 */

export type ListFilters = Record<string, string | number | undefined | null>;

function listKey(
  base: readonly string[],
  filters?: ListFilters,
): readonly (string | number)[] {
  if (!filters) return base;
  const parts: (string | number)[] = [...base];
  const keys = Object.keys(filters).sort();
  for (const key of keys) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") {
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
    googleSyncStatus: (id: string) => ["calendars", "google-sync-status", id] as const,
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
    platformProviders: () => ["integrations", "platform", "providers"] as const,
    platformList: () => ["integrations", "platform", "list"] as const,
    platformDetail: (providerKey: string) =>
      ["integrations", "platform", "detail", providerKey] as const,
  },
  platform: {
    businesses: {
      all: () => ["platform", "businesses"] as const,
      list: (filters: { page?: number; limit?: number; search?: string; status?: string }) =>
        listKey(["platform", "businesses", "list"], filters),
      detail: (id: string) => ["platform", "business", id] as const,
      members: (id: string) => ["platform", "business", id, "members"] as const,
      audit: (id: string, filters?: { page?: number; limit?: number }) =>
        listKey(["platform", "business", id, "audit"], filters),
      subscription: (id: string) =>
        ["platform", "business", id, "subscription"] as const,
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
    plans: {
      all: () => ["platform", "plans"] as const,
      active: () => ["platform", "plans", "active"] as const,
      list: (filters: { page?: number; limit?: number; status?: string }) =>
        listKey(["platform", "plans", "list"], filters),
    },
    industries: {
      all: () => ["platform", "industries"] as const,
      list: (filters: { page?: number; limit?: number; status?: string }) =>
        listKey(["platform", "industries", "list"], filters),
      detail: (id: string) => ["platform", "industries", id] as const,
    },
    billing: {
      all: () => ["platform", "billing"] as const,
      overview: () => ["platform", "billing", "overview"] as const,
      subscriptions: (filters: {
        page?: number;
        limit?: number;
        status?: string;
      }) => listKey(["platform", "billing", "subscriptions"], filters),
    },
    settings: () => ["platform", "settings"] as const,
    dashboard: {
      stats: () => ["platform", "dashboard", "stats"] as const,
    },
  },
} as const;
