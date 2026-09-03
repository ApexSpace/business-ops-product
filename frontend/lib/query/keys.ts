/**
 * Centralized React Query keys for consistent caching and invalidation.
 */

export type ListFilters = Record<
  string,
  string | number | boolean | Array<string | number> | undefined | null
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
    if (Array.isArray(value)) {
      if (value.length > 0) parts.push(key, value.join(","));
    } else if (typeof value === "boolean") {
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
  search: {
    global: (q: string) => ["search", "global", q] as const,
  },
  business: {
    current: () => ["business", "current"] as const,
    access: () => ["business", "access"] as const,
    snapshotContext: (businessId: string) =>
      ["business", businessId, "snapshot-context"] as const,
    financialSettings: () => ["business", "financial-settings"] as const,
    members: (
      filters?: { page?: number; limit?: number; search?: string },
      apiBase = "businesses/current/members",
    ) => listKey(["business", "members", apiBase], filters),
    memberDetail: (userId: string) =>
      ["business", "members", "detail", userId] as const,
    memberPermissions: (userId: string) =>
      ["business", "members", userId, "permissions"] as const,
    memberNotifications: (userId: string) =>
      ["business", "members", userId, "notifications"] as const,
    memberCompensation: (userId: string) =>
      ["business", "members", userId, "compensation"] as const,
    memberServices: (userId: string) =>
      ["business", "members", userId, "services"] as const,
    dashboardStats: () => ["business", "dashboard-stats"] as const,
    dashboardFeed: () => ["business", "dashboard-feed"] as const,
    planOptions: () => ["business", "plan-options"] as const,
  },
  services: {
    all: (apiBase = "services") => ["services", apiBase] as const,
    list: (
      filters: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        categoryId?: string;
      },
      apiBase = "services",
    ) => listKey(["services", apiBase, "list"], filters),
    picker: (apiBase = "services") => ["services", apiBase, "picker"] as const,
    detail: (id: string, apiBase = "services") =>
      ["services", apiBase, "detail", id] as const,
    tree: () => ["services", "tree"] as const,
    workspace: (id: string) => ["services", "workspace", id] as const,
  },
  serviceCategories: {
    all: () => ["service-categories"] as const,
    list: () => ["service-categories", "list"] as const,
  },
  contacts: {
    all: (apiBase = "contacts") => ["contacts", apiBase] as const,
    list: (
      filters: { page?: number; limit?: number; search?: string },
      apiBase = "contacts",
    ) => listKey(["contacts", apiBase, "list"], filters),
    search: (term: string, apiBase = "contacts") =>
      ["contacts", apiBase, "search", term] as const,
    picker: (apiBase = "contacts") => ["contacts", apiBase, "picker"] as const,
    detail: (id: string, apiBase = "contacts") =>
      ["contacts", apiBase, "detail", id] as const,
    timeline: (
      id: string,
      filters?: { types?: string[]; page?: number; limit?: number },
    ) => listKey(["contacts", id, "timeline"], filters),
    wallet: (id: string) => ["contacts", id, "wallet"] as const,
    adjustments: (id: string) => ["contacts", id, "adjustments"] as const,
    memberships: (id: string) => ["contacts", id, "memberships"] as const,
    printAppointments: (id: string) =>
      ["contacts", id, "print-appointments"] as const,
  },
  workItems: {
    all: (apiBase = "work-items") => ["work-items", apiBase] as const,
    list: (
      apiBase: string,
      filters: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        serviceId?: string;
        contactId?: string;
        assignedToId?: string;
      },
    ) => listKey(["work-items", apiBase, "list"], filters),
    detail: (apiBase: string, id: string) =>
      ["work-items", apiBase, "detail", id] as const,
  },
  socialPlanner: {
    all: () => ["social-planner"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      status?: string;
      providerKey?: string;
      from?: string;
      to?: string;
    }) => listKey(["social-planner", "list"], filters),
    detail: (id: string) => ["social-planner", "detail", id] as const,
    calendar: (from: string, to: string) =>
      ["social-planner", "calendar", from, to] as const,
    platformSchemas: () => ["social-planner", "platform-schemas"] as const,
    comments: (filters: {
      providerKey?: string;
      socialPostId?: string;
      unreadOnly?: boolean;
      search?: string;
    } = {}) => listKey(["social-planner", "comments"], filters),
    engagement: (filters: {
      providerKey?: string;
      socialPostId?: string;
      unreadOnly?: boolean;
      search?: string;
      refresh?: boolean;
    } = {}) =>
      // v2: flat { items, warnings } shape (not nested meta.warnings)
      listKey(["social-planner", "engagement", "v2"], filters),
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
    stripeContext: () => ["payments", "stripe-context"] as const,
    contactMethods: (contactId: string) =>
      ["payments", "contact-methods", contactId] as const,
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
  paymentAccounts: {
    primary: () => ["payment-accounts", "primary"] as const,
  },
  checkouts: {
    all: () => ["checkouts"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      contactId?: string;
      status?: string;
    }) => listKey(["checkouts", "list"], filters),
    detail: (id: string) => ["checkouts", "detail", id] as const,
    services: () => ["checkouts", "picker", "services"] as const,
    serviceStaff: (serviceId: string) =>
      ["checkouts", "picker", "services", serviceId, "staff"] as const,
    products: (search?: string) =>
      ["checkouts", "picker", "products", search ?? ""] as const,
    staffOffers: () => ["checkouts", "picker", "offers"] as const,
  },
  products: {
    all: () => ["products"] as const,
    list: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      categoryId?: string;
      productType?: string;
    }) => listKey(["products", "list"], filters),
    detail: (id: string) => ["products", "detail", id] as const,
    picker: (search?: string) =>
      ["products", "picker", search ?? ""] as const,
    categories: () => ["products", "categories"] as const,
    variants: (productId: string) =>
      ["products", productId, "variants"] as const,
    options: (productId: string) =>
      ["products", productId, "options"] as const,
    inventory: (productId: string, variantId?: string) =>
      ["products", productId, "inventory", variantId ?? ""] as const,
    featuredImageDownload: (productId: string) =>
      ["products", productId, "images", "featured", "download-url"] as const,
    featuredImage: (productId: string) =>
      ["products", productId, "images", "featured"] as const,
    gallery: (productId: string) =>
      ["products", productId, "images", "gallery"] as const,
    galleryImageDownload: (productId: string, imageId: string) =>
      ["products", productId, "images", imageId, "download-url"] as const,
  },
  resources: {
    all: () => ["resources"] as const,
    groups: () => ["resources", "groups"] as const,
    list: (filters: {
      groupId?: string;
      resourceType?: string;
      search?: string;
    }) => listKey(["resources", "list"], filters),
    workspace: (id: string) => ["resources", "workspace", id] as const,
    picker: (search?: string) =>
      ["resources", "picker", search ?? ""] as const,
  },
  timeClock: {
    all: () => ["time-clock"] as const,
    cards: {
      list: (filters?: ListFilters) =>
        listKey(["time-clock", "cards", "list"], filters),
      detail: (id: string) => ["time-clock", "cards", "detail", id] as const,
    },
  },
  giftCards: {
    all: () => ["gift-cards"] as const,
    list: (filters?: {
      page?: number;
      limit?: number;
      search?: string;
      redeemableOnly?: boolean;
    }) => listKey(["gift-cards", "list"], filters),
    detail: (id: string) => ["gift-cards", "detail", id] as const,
    settings: () => ["gift-cards", "settings"] as const,
    onlineSalesShare: () => ["gift-cards", "online-sales-share"] as const,
    promotions: () => ["gift-cards", "promotions"] as const,
    contact: (contactId: string) =>
      ["gift-cards", "contact", contactId] as const,
  },
  packages: {
    all: () => ["packages"] as const,
    templates: () => ["packages", "templates"] as const,
    template: (id: string) => ["packages", "template", id] as const,
    clientList: (filters?: ListFilters) =>
      listKey(["packages", "client-list"], filters),
    clientDetail: (id: string) => ["packages", "client-detail", id] as const,
    settings: () => ["packages", "settings"] as const,
    contact: (contactId: string) =>
      ["packages", "contact", contactId] as const,
  },
  offers: {
    all: () => ["offers"] as const,
    list: (filters?: ListFilters) =>
      listKey(["offers", "list"], filters),
    detail: (id: string) => ["offers", "detail", id] as const,
  },
  memberships: {
    all: () => ["memberships"] as const,
    plans: (includeArchived?: boolean) =>
      includeArchived
        ? (["memberships", "plans", "archived"] as const)
        : (["memberships", "plans"] as const),
    plan: (id: string) => ["memberships", "plan", id] as const,
    clientList: (filters?: ListFilters) =>
      listKey(["memberships", "client-list"], filters),
    clientDetail: (id: string) =>
      ["memberships", "client-detail", id] as const,
    settings: () => ["memberships", "settings"] as const,
    contact: (contactId: string) =>
      ["memberships", "contact", contactId] as const,
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
    list: (apiBase = "pipelines") =>
      ["pipelines", apiBase, "list"] as const,
    detail: (id: string, apiBase = "pipelines") =>
      ["pipelines", apiBase, "detail", id] as const,
    lifecycleBoard: (apiBase: string, pipelineId: string) =>
      ["pipelines", apiBase, "lifecycle-board", pipelineId] as const,
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
  schedulingSettings: {
    detail: () => ["scheduling-settings"] as const,
  },
  onlineBookingSettings: {
    detail: () => ["online-booking-settings"] as const,
  },
  calendarDisplaySettings: {
    detail: () => ["calendar-display-settings"] as const,
  },
  waitingRoomSettings: {
    detail: () => ["waiting-room-settings"] as const,
  },
  appointmentAutomatedMessages: {
    detail: (eventType: string) =>
      ["appointment-automated-messages", eventType] as const,
    catalog: (eventType: string) =>
      ["appointment-automated-messages", eventType, "catalog"] as const,
  },
  customFees: {
    all: () => ["custom-fees"] as const,
    list: (filters?: { page?: number; limit?: number; search?: string }) =>
      listKey(["custom-fees", "list"], filters),
    detail: (id: string) => ["custom-fees", "detail", id] as const,
  },
  checkoutAdvancedSettings: {
    detail: () => ["checkout-advanced-settings"] as const,
  },
  cancelRescheduleSettings: {
    detail: () => ["cancel-reschedule-settings"] as const,
  },
  chatbots: {
    all: (apiBase = "chatbots") => ["chatbots", apiBase] as const,
    list: (apiBase = "chatbots") => ["chatbots", apiBase, "list"] as const,
    detail: (apiBase: string, id: string) =>
      ["chatbots", apiBase, "detail", id] as const,
    rules: (apiBase: string, id: string) =>
      ["chatbots", apiBase, id, "rules"] as const,
    embed: (apiBase: string, id: string) =>
      ["chatbots", apiBase, id, "embed"] as const,
    default: (apiBase = "chatbots") =>
      ["chatbots", apiBase, "default"] as const,
  },
  cannedResponses: {
    all: (apiBase: string = "canned-responses") =>
      ["canned-responses", apiBase] as const,
    list: (apiBase: string = "canned-responses") =>
      ["canned-responses", apiBase, "list"] as const,
  },
  forms: {
    all: () => ["forms"] as const,
    list: (
      apiBase: string,
      filters?: {
        search?: string;
        status?: string;
        sort?: string;
        sortDir?: string;
      },
    ) => listKey(["forms", apiBase, "list"], filters),
    detail: (apiBase: string, id: string) =>
      ["forms", apiBase, "detail", id] as const,
    embed: (apiBase: string, id: string) =>
      ["forms", apiBase, "embed", id] as const,
    submissions: (
      apiBase: string,
      formId: string,
      filters?: { page?: number; limit?: number },
    ) => listKey(["forms", apiBase, formId, "submissions"], filters),
    categories: (apiBase: string) =>
      ["forms", apiBase, "metadata", "categories"] as const,
    fieldTypes: (apiBase: string, filters?: ListFilters) =>
      listKey(["forms", apiBase, "metadata", "field-types"], filters),
    palette: (apiBase: string, filters?: ListFilters) =>
      listKey(["forms", apiBase, "metadata", "palette"], filters),
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
  notificationChannelPreferences: {
    all: () => ["notification-channel-preferences"] as const,
    list: () => ["notification-channel-preferences", "list"] as const,
    detail: (notificationKey: string) =>
      [
        "notification-channel-preferences",
        "detail",
        notificationKey,
      ] as const,
  },
  automations: {
    all: () => ["automations"] as const,
    categories: (apiBase: string, scope?: string) =>
      listKey(
        ["automations", apiBase, "categories"],
        scope ? { scope } : undefined,
      ),
    triggers: (apiBase: string, filters?: ListFilters) =>
      listKey(["automations", apiBase, "triggers"], filters),
    actions: (apiBase: string, filters?: ListFilters) =>
      listKey(["automations", apiBase, "actions"], filters),
    customValues: (apiBase: string, filters?: ListFilters) =>
      listKey(["automations", apiBase, "custom-values"], filters),
    conditions: (apiBase: string, filters?: ListFilters) =>
      listKey(["automations", apiBase, "conditions"], filters),
    filterOperators: (apiBase: string) =>
      ["automations", apiBase, "filter-operators"] as const,
    workflows: {
      all: (apiBase: string) => ["automations", apiBase, "workflows"] as const,
      list: (apiBase: string, filters?: ListFilters) =>
        listKey(["automations", apiBase, "workflows", "list"], filters),
      detail: (apiBase: string, id: string) =>
        ["automations", apiBase, "workflows", "detail", id] as const,
    },
    workflowRuns: {
      all: (apiBase: string) =>
        ["automations", apiBase, "workflow-runs"] as const,
      list: (apiBase: string, filters?: ListFilters) =>
        listKey(["automations", apiBase, "workflow-runs", "list"], filters),
    },
  },
  conversations: {
    all: (apiBase: string = "conversations") =>
      ["conversations", apiBase] as const,
    list: (
      filters?: Record<string, string | number | undefined | null>,
      apiBase: string = "conversations",
    ) => listKey(["conversations", apiBase, "list"], filters),
    unifiedList: (
      filters?: Record<string, string | number | undefined | null>,
      apiBase: string = "conversations",
    ) => listKey(["conversations", apiBase, "unified", "list"], filters),
    detail: (id: string, apiBase: string = "conversations") =>
      ["conversations", apiBase, "detail", id] as const,
    messages: (id: string, page?: number, apiBase: string = "conversations") =>
      ["conversations", apiBase, id, "messages", page ?? 1] as const,
    contactMessages: (
      contactId: string,
      page?: number,
      apiBase: string = "conversations",
    ) =>
      [
        "conversations",
        apiBase,
        "contacts",
        contactId,
        "messages",
        page ?? 0,
      ] as const,
    replyChannels: (contactId: string, apiBase: string = "conversations") =>
      ["conversations", apiBase, "contacts", contactId, "reply-channels"] as const,
    byContact: (contactId: string, apiBase: string = "conversations") =>
      ["conversations", apiBase, "by-contact", contactId] as const,
    notes: (conversationId: string, apiBase: string = "conversations") =>
      ["conversations", apiBase, conversationId, "notes"] as const,
    opsContext: () => ["conversations", "platform", "ops-context"] as const,
  },
  appointments: {
    all: () => ["appointments"] as const,
    list: (filters?: Record<string, string | number | undefined | null>) =>
      listKey(["appointments", "list"], filters),
    detail: (id: string) => ["appointments", "detail", id] as const,
  },
  waitlist: {
    all: () => ["waitlist"] as const,
    summary: () => ["waitlist", "summary"] as const,
    list: (filters?: ListFilters) =>
      listKey(["waitlist", "list"], filters),
    detail: (id: string) => ["waitlist", "detail", id] as const,
  },
  integrations: {
    all: () => ["integrations"] as const,
    businessProviders: () => ["integrations", "business", "providers"] as const,
    businessList: () => ["integrations", "business", "list"] as const,
    businessDetail: (providerKey: string) =>
      ["integrations", "business", "detail", providerKey] as const,
    businessResources: (providerKey: string, host: "business" | "platform" = "business") =>
      ["integrations", host, "resources", providerKey] as const,
    messagingStatus: (providerKey: string, host: "business" | "platform" = "business") =>
      ["integrations", host, "messaging-status", providerKey] as const,
    platformEmail: () => ["integrations", "business", "platform-email"] as const,
    platformProviders: () => ["integrations", "platform", "providers"] as const,
    platformList: () => ["integrations", "platform", "list"] as const,
    platformDetail: (providerKey: string) =>
      ["integrations", "platform", "detail", providerKey] as const,
  },
  storage: {
    all: ["storage"] as const,
    file: (id: string) => ["storage", "file", id] as const,
  },
  whatsappSettings: {
    overview: () => ["whatsapp-settings", "overview"] as const,
    numbers: () => ["whatsapp-settings", "numbers"] as const,
    templates: {
      all: () => ["whatsapp-settings", "templates"] as const,
      list: (filters: Record<string, unknown>) =>
        ["whatsapp-settings", "templates", "list", filters] as const,
      options: () => ["whatsapp-settings", "templates", "options"] as const,
      approved: () => ["whatsapp-settings", "templates", "approved"] as const,
      detail: (id: string) =>
        ["whatsapp-settings", "templates", "detail", id] as const,
    },
  },
  reports: {
    all: () => ["reports"] as const,
    catalog: () => ["reports", "catalog"] as const,
    document: (reportKey: string, filters?: ListFilters) =>
      listKey(["reports", "document", reportKey], filters),
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
    tiers: {
      all: () => ["platform", "tiers"] as const,
      list: (filters: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        isPublic?: boolean;
      }) => listKey(["platform", "tiers", "list"], filters),
      detail: (id: string) => ["platform", "tiers", id] as const,
    },
    addons: {
      all: () => ["platform", "addons"] as const,
      list: (filters: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        purchaseMode?: string;
      }) => listKey(["platform", "addons", "list"], filters),
      detail: (id: string) => ["platform", "addons", id] as const,
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
