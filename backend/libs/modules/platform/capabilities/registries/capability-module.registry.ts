import type { RegistryFeatureDefinition } from '../types/capability-registry.types';

/** Admin-facing toggle for a real app capability within a module. */
export type RegistryModuleOption = {
  key: string;
  name: string;
  description: string;
  group?: string;
  permissionKey?: string;
  routeKeys?: string[];
  icon?: string;
  defaultEnabled?: boolean;
  isBillable?: boolean;
};

export type RegistryModuleDefinition = {
  moduleKey: string;
  name: string;
  description: string;
  icon?: string;
  sortOrder: number;
  options: RegistryModuleOption[];
};

type ModuleOptionInput = Omit<RegistryModuleOption, 'key'> & { key: string };

function option(
  moduleKey: string,
  suffix: string,
  data: Omit<RegistryModuleOption, 'key'>,
): RegistryModuleOption {
  return { key: `${moduleKey}.${suffix}`, ...data };
}

function crudOptions(
  moduleKey: string,
  entityName: string,
  description: string,
  readPermission: string,
  writePermission: string,
  routeKeys?: string[],
  icon?: string,
  isBillable?: boolean,
  group = 'Records',
  keyPrefix?: string,
): RegistryModuleOption[] {
  const route = routeKeys ? { routeKeys } : {};
  const billable = isBillable ? { isBillable: true } : {};
  const key = (suffix: string) =>
    keyPrefix ? `${keyPrefix}.${suffix}` : suffix;
  return [
    option(moduleKey, key('list'), {
      name: `View ${entityName}`,
      description: `Browse and search ${description}.`,
      permissionKey: readPermission,
      icon,
      defaultEnabled: true,
      group,
      ...route,
      ...billable,
    }),
    option(moduleKey, key('create'), {
      name: `Create ${entityName}`,
      description: `Create new ${description}.`,
      permissionKey: writePermission,
      icon,
      group,
      ...route,
      ...billable,
    }),
    option(moduleKey, key('edit'), {
      name: `Edit ${entityName}`,
      description: `Edit existing ${description}.`,
      permissionKey: writePermission,
      icon,
      group,
      ...route,
      ...billable,
    }),
    option(moduleKey, key('delete'), {
      name: `Delete ${entityName}`,
      description: `Remove ${description}.`,
      permissionKey: writePermission,
      icon,
      group,
      ...route,
      ...billable,
    }),
  ];
}

function optionToFeature(
  mod: Pick<RegistryModuleDefinition, 'moduleKey' | 'name'>,
  opt: RegistryModuleOption,
): Omit<RegistryFeatureDefinition, 'moduleKey' | 'moduleName'> & {
  featureKey: string;
  featureName: string;
} {
  return {
    featureKey: opt.key,
    featureName: opt.name,
    description: opt.description,
    permissionKey: opt.permissionKey,
    routeKeys: opt.routeKeys,
    icon: opt.icon,
    defaultEnabled: opt.defaultEnabled,
    isBillable: opt.isBillable,
  };
}

/** Business-level integration providers shown on /business/settings/integrations. */
const BUSINESS_INTEGRATION_PROVIDERS: Array<{
  key: string;
  name: string;
  description: string;
}> = [
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    description: 'Send and receive WhatsApp messages with customers.',
  },
  {
    key: 'sms',
    name: 'SMS',
    description: 'Text messaging for notifications and two-way conversations.',
  },
  {
    key: 'email',
    name: 'Email',
    description: 'Transactional and marketing email delivery.',
  },
  {
    key: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync appointments and availability with Google Calendar.',
  },
  {
    key: 'google-business-profile',
    name: 'Google Business Profile',
    description: 'Manage reviews and business listings on Google.',
  },
  {
    key: 'stripe',
    name: 'Stripe',
    description:
      'Connect a Stripe account to accept online payments and invoice checkout.',
  },
  {
    key: 'facebook',
    name: 'Facebook',
    description: 'Connect a Facebook page for messaging and posting.',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    description: 'Manage Instagram messaging and content.',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect LinkedIn for business identity and social features.',
  },
  {
    key: 'tiktok-messaging',
    name: 'TikTok Messaging',
    description: 'Respond to TikTok direct messages.',
  },
  {
    key: 'google-lead-ads',
    name: 'Google Lead Ads',
    description: 'Import leads from Google Ads lead form extensions.',
  },
  {
    key: 'tiktok-lead-ads',
    name: 'TikTok Lead Ads',
    description: 'Capture leads from TikTok advertising campaigns.',
  },
  {
    key: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices and payments with QuickBooks Online.',
  },
  {
    key: 'xero',
    name: 'Xero',
    description: 'Sync financial data with Xero accounting.',
  },
  {
    key: 'wave',
    name: 'Wave',
    description: 'Connect Wave for invoicing and bookkeeping.',
  },
];

function integrationProviderOptions(): RegistryModuleOption[] {
  return BUSINESS_INTEGRATION_PROVIDERS.map((provider) =>
    option('settings', `integrations.${provider.key}`, {
      name: provider.name,
      description: provider.description,
      permissionKey: 'integrations.manage',
      routeKeys: ['/business/settings/integrations'],
      icon: 'plug',
      group: 'Integrations',
    }),
  );
}

/**
 * Platform module catalog — primary admin-facing unit.
 *
 * Removed modules (no shipped business UI as of 2026-06-08):
 * - forms — no form builder or submissions pages
 * - automation — /business/settings/automations is a placeholder only
 * - email_marketing — no campaigns, templates, or automations UI
 */
export const REGISTRY_MODULES: RegistryModuleDefinition[] = [
  {
    moduleKey: 'contacts',
    name: 'Contacts',
    description: 'Contact records, profiles, and relationship management.',
    icon: 'users',
    sortOrder: 10,
    options: [
      ...crudOptions(
        'contacts',
        'Contacts',
        'contact records',
        'crm.contacts.read',
        'crm.contacts.write',
        ['/business/contacts'],
        'contact',
      ),
      option('contacts', 'workspace', {
        name: 'Contact workspace',
        description: 'Open contact detail workspace with profile and records.',
        permissionKey: 'crm.contacts.read',
        routeKeys: ['/business/contacts'],
        icon: 'contact',
        group: 'Workspace',
      }),
      option('contacts', 'conversation', {
        name: 'Conversation panel',
        description: 'Two-way messaging panel inside the contact workspace.',
        permissionKey: 'whatsapp.inbox.read',
        routeKeys: ['/business/contacts'],
        icon: 'message-square',
        group: 'Workspace',
      }),
      option('contacts', 'tags', {
        name: 'Tags',
        description: 'Assign and manage tags on contact records.',
        permissionKey: 'crm.contacts.write',
        routeKeys: ['/business/contacts'],
        icon: 'tag',
        group: 'Workspace',
      }),
      option('contacts', 'workspace.activity', {
        name: 'Activity timeline',
        description: 'View unified activity history on a contact.',
        permissionKey: 'crm.contacts.read',
        group: 'Workspace sections',
      }),
      option('contacts', 'workspace.leads', {
        name: 'Opportunities',
        description: 'View and manage leads linked to a contact.',
        permissionKey: 'crm.leads.read',
        group: 'Workspace sections',
      }),
      option('contacts', 'workspace.work_items', {
        name: 'Work items',
        description: 'View and manage work items on a contact.',
        permissionKey: 'crm.work_items.read',
        group: 'Workspace sections',
      }),
      option('contacts', 'workspace.appointments', {
        name: 'Appointments',
        description: 'View and manage appointments on a contact.',
        permissionKey: 'calendar.appointments.read',
        group: 'Workspace sections',
      }),
      option('contacts', 'workspace.notes', {
        name: 'Notes',
        description: 'Create and manage notes on a contact.',
        permissionKey: 'crm.contacts.write',
        group: 'Workspace sections',
      }),
      option('contacts', 'workspace.tasks', {
        name: 'Tasks',
        description: 'Create and manage tasks on a contact.',
        permissionKey: 'crm.work_items.read',
        group: 'Workspace sections',
      }),
      option('contacts', 'workspace.invoices', {
        name: 'Invoices',
        description: 'View invoices linked to a contact.',
        permissionKey: 'payments.invoices.read',
        group: 'Workspace sections',
      }),
      option('contacts', 'workspace.estimates', {
        name: 'Estimates',
        description: 'View estimates linked to a contact.',
        permissionKey: 'payments.invoices.read',
        group: 'Workspace sections',
      }),
      option('contacts', 'workspace.payments', {
        name: 'Received payments',
        description: 'View payments received from a contact.',
        permissionKey: 'payments.invoices.read',
        group: 'Workspace sections',
      }),
    ],
  },
  {
    moduleKey: 'pipelines',
    name: 'Pipelines',
    description: 'Sales pipeline boards and deal stages.',
    icon: 'git-branch',
    sortOrder: 20,
    options: [
      ...crudOptions(
        'pipelines',
        'Pipelines',
        'pipeline boards and deals',
        'crm.pipelines.read',
        'crm.pipelines.write',
        ['/business/pipelines'],
        'git-branch',
      ),
      option('pipelines', 'board', {
        name: 'Kanban board',
        description: 'Drag-and-drop pipeline board view.',
        permissionKey: 'crm.pipelines.read',
        routeKeys: ['/business/pipelines'],
        icon: 'git-branch',
        group: 'Board',
        defaultEnabled: true,
      }),
      option('pipelines', 'stages', {
        name: 'Stage management',
        description: 'Configure pipeline stages and stage types.',
        permissionKey: 'crm.pipelines.write',
        routeKeys: ['/business/settings/pipelines'],
        icon: 'git-branch',
        group: 'Board',
      }),
    ],
  },
  {
    moduleKey: 'work_items',
    name: 'Work Items',
    description: 'Tasks and work items linked to CRM records.',
    icon: 'clipboard-list',
    sortOrder: 30,
    options: crudOptions(
      'work_items',
      'Work Items',
      'tasks and work items',
      'crm.work_items.read',
      'crm.work_items.write',
      ['/business/work-items'],
      'clipboard-list',
    ),
  },
  {
    moduleKey: 'leads',
    name: 'Leads',
    description: 'Lead tracking and qualification.',
    icon: 'target',
    sortOrder: 40,
    options: crudOptions(
      'leads',
      'Leads',
      'leads',
      'crm.leads.read',
      'crm.leads.write',
      ['/business/leads'],
      'target',
    ),
  },
  {
    moduleKey: 'conversations',
    name: 'Conversations',
    description: 'Two-way messaging inbox across connected channels.',
    icon: 'message-square',
    sortOrder: 50,
    options: [
      option('conversations', 'inbox', {
        name: 'Inbox',
        description: 'Access the conversations inbox.',
        permissionKey: 'whatsapp.inbox.read',
        routeKeys: ['/business/conversations'],
        icon: 'message-square',
        group: 'Messaging',
        defaultEnabled: true,
      }),
      option('conversations', 'read', {
        name: 'Read messages',
        description: 'View conversation threads and message history.',
        permissionKey: 'whatsapp.inbox.read',
        routeKeys: ['/business/conversations'],
        icon: 'message-square',
        group: 'Messaging',
        defaultEnabled: true,
      }),
      option('conversations', 'send', {
        name: 'Send messages',
        description: 'Compose and send outbound messages.',
        permissionKey: 'whatsapp.inbox.write',
        routeKeys: ['/business/conversations'],
        icon: 'message-square',
        group: 'Messaging',
      }),
    ],
  },
  {
    moduleKey: 'appointments',
    name: 'Appointments',
    description: 'Scheduling and appointment management.',
    icon: 'calendar',
    sortOrder: 60,
    options: [
      ...crudOptions(
        'appointments',
        'Appointments',
        'appointments',
        'calendar.appointments.read',
        'calendar.appointments.write',
        ['/business/appointments'],
        'calendar',
      ),
      option('appointments', 'calendar', {
        name: 'Calendar view',
        description: 'View appointments on the business calendar.',
        permissionKey: 'calendar.appointments.read',
        routeKeys: ['/business/appointments'],
        icon: 'calendar',
        group: 'Scheduling',
        defaultEnabled: true,
      }),
    ],
  },
  {
    moduleKey: 'calendar',
    name: 'Calendar',
    description: 'Business calendars and availability.',
    icon: 'calendar-days',
    sortOrder: 70,
    options: [
      ...crudOptions(
        'calendar',
        'Calendars',
        'business calendars',
        'calendar.calendars.read',
        'calendar.calendars.write',
        ['/business/settings/calendars'],
        'calendar-days',
      ),
      option('calendar', 'availability', {
        name: 'Availability templates',
        description: 'Configure calendar availability and booking windows.',
        permissionKey: 'calendar.calendars.write',
        routeKeys: ['/business/settings/calendars'],
        icon: 'calendar-days',
        group: 'Scheduling',
      }),
    ],
  },
  {
    moduleKey: 'payments',
    name: 'Payments',
    description: 'Estimates, invoices, transactions, and payment collection.',
    icon: 'credit-card',
    sortOrder: 80,
    options: [
      ...crudOptions(
        'payments',
        'Estimates',
        'estimates and quotes',
        'payments.invoices.read',
        'payments.invoices.write',
        ['/business/payments'],
        'credit-card',
        true,
        'Estimates',
        'estimates',
      ),
      ...crudOptions(
        'payments',
        'Invoices',
        'invoices',
        'payments.invoices.read',
        'payments.invoices.write',
        ['/business/payments'],
        'credit-card',
        true,
        'Invoices',
        'invoices',
      ),
      ...crudOptions(
        'payments',
        'Transactions',
        'payment transactions',
        'payments.invoices.read',
        'payments.invoices.write',
        ['/business/payments'],
        'credit-card',
        true,
        'Transactions',
        'transactions',
      ),
      option('payments', 'refund', {
        name: 'Refund payments',
        description: 'Issue refunds on received payments.',
        permissionKey: 'payments.invoices.write',
        routeKeys: ['/business/payments'],
        icon: 'credit-card',
        group: 'Transactions',
        isBillable: true,
      }),
      option('payments', 'collect', {
        name: 'Collect payments',
        description: 'Record and collect payments from customers.',
        permissionKey: 'payments.invoices.write',
        routeKeys: ['/business/payments'],
        icon: 'credit-card',
        group: 'Transactions',
        isBillable: true,
      }),
    ],
  },
  {
    moduleKey: 'ai_agents',
    name: 'AI Agents',
    description: 'Chatbots for customer engagement on your website.',
    icon: 'bot',
    sortOrder: 90,
    options: [
      ...crudOptions(
        'ai_agents',
        'Chatbots',
        'chatbots',
        'ai.chatbots.read',
        'ai.chatbots.write',
        ['/business/settings/chatbots'],
        'bot',
        true,
      ),
      option('ai_agents', 'rules', {
        name: 'Chatbot rules',
        description: 'Configure trigger phrases and automated responses.',
        permissionKey: 'ai.chatbots.write',
        routeKeys: ['/business/settings/chatbots'],
        icon: 'bot',
        group: 'Configuration',
        isBillable: true,
      }),
    ],
  },
  {
    moduleKey: 'settings',
    name: 'Settings',
    description: 'Business settings pages and configuration.',
    icon: 'settings',
    sortOrder: 100,
    options: [
      option('settings', 'profile', {
        name: 'Business profile',
        description: 'Business name, branding, and public profile.',
        permissionKey: 'settings.business.read',
        routeKeys: ['/business/settings/profile'],
        icon: 'settings',
        group: 'General',
        defaultEnabled: true,
      }),
      option('settings', 'team', {
        name: 'Team members',
        description: 'Invite and manage team members.',
        permissionKey: 'settings.team.read',
        routeKeys: ['/business/settings/team'],
        icon: 'users',
        group: 'General',
      }),
      option('settings', 'calendars', {
        name: 'Calendars',
        description: 'Configure business calendars.',
        permissionKey: 'calendar.calendars.read',
        routeKeys: ['/business/settings/calendars'],
        icon: 'calendar',
        group: 'Operations',
      }),
      option('settings', 'services', {
        name: 'Services',
        description: 'Manage bookable services and pricing.',
        permissionKey: 'settings.services.read',
        routeKeys: ['/business/settings/services'],
        icon: 'briefcase',
        group: 'Operations',
      }),
      option('settings', 'pipelines', {
        name: 'Pipelines',
        description: 'Configure sales pipelines and stages.',
        permissionKey: 'crm.pipelines.read',
        routeKeys: ['/business/settings/pipelines'],
        icon: 'git-branch',
        group: 'Operations',
      }),
      option('settings', 'financial', {
        name: 'Financial settings',
        description: 'Tax, currency, and financial defaults.',
        permissionKey: 'payments.invoices.read',
        routeKeys: ['/business/settings/financial'],
        icon: 'receipt',
        group: 'Operations',
      }),
      option('settings', 'templates', {
        name: 'Templates',
        description: 'Message and document templates.',
        permissionKey: 'settings.templates.read',
        routeKeys: ['/business/settings/templates'],
        icon: 'file-text',
        group: 'Operations',
      }),
      option('settings', 'chatbots', {
        name: 'Chatbots',
        description: 'Website chatbot configuration.',
        permissionKey: 'ai.chatbots.read',
        routeKeys: ['/business/settings/chatbots'],
        icon: 'message-square',
        group: 'Website',
      }),
      option('settings', 'automations', {
        name: 'Automations',
        description: 'Workflow automations (placeholder UI).',
        permissionKey: 'settings.automations.read',
        routeKeys: ['/business/settings/automations'],
        icon: 'zap',
        group: 'Automation',
      }),
      option('settings', 'billing', {
        name: 'Billing',
        description: 'Subscription and billing management.',
        permissionKey: 'settings.billing.read',
        routeKeys: ['/business/settings/billing'],
        icon: 'credit-card',
        group: 'Billing',
      }),
      option('settings', 'integrations', {
        name: 'Integrations hub',
        description: 'Access the integrations settings page.',
        permissionKey: 'integrations.manage',
        routeKeys: ['/business/settings/integrations'],
        icon: 'plug',
        group: 'Integrations',
      }),
      ...integrationProviderOptions(),
      option('settings', 'notifications', {
        name: 'Notifications',
        description: 'Email and in-app notification preferences.',
        permissionKey: 'settings.notifications.read',
        routeKeys: ['/business/settings/notifications'],
        icon: 'bell',
        group: 'Preferences',
      }),
      option('settings', 'appearance', {
        name: 'Appearance',
        description: 'Theme and display preferences.',
        permissionKey: 'settings.appearance.read',
        routeKeys: ['/business/settings/appearance'],
        icon: 'palette',
        group: 'Preferences',
      }),
    ],
  },
];

export function getRegistryModules(): RegistryModuleDefinition[] {
  return REGISTRY_MODULES;
}

export function getRegistryModule(
  moduleKey: string,
): RegistryModuleDefinition | undefined {
  return REGISTRY_MODULES.find((m) => m.moduleKey === moduleKey);
}

export function getAllRegistryModuleKeys(): Set<string> {
  return new Set(REGISTRY_MODULES.map((m) => m.moduleKey));
}

export function getModuleOptions(moduleKey: string): RegistryModuleOption[] {
  return getRegistryModule(moduleKey)?.options ?? [];
}

export function getFeatureKeysForModule(moduleKey: string): string[] {
  return getModuleOptions(moduleKey).map((o) => o.key);
}

export function getFeatureKeysForEnabledOptions(
  moduleKey: string,
  options: Record<string, boolean | undefined>,
): string[] {
  const moduleOptions = getModuleOptions(moduleKey);
  return moduleOptions.filter((opt) => options[opt.key]).map((opt) => opt.key);
}

export function deriveOptionsFromFeatureKeys(
  moduleKey: string,
  assignedFeatureKeys: Set<string>,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const opt of getModuleOptions(moduleKey)) {
    result[opt.key] = assignedFeatureKeys.has(opt.key);
  }
  return result;
}

export function flattenRegistryFeatures(): RegistryFeatureDefinition[] {
  return REGISTRY_MODULES.flatMap((mod) =>
    mod.options.map((opt) => ({
      moduleKey: mod.moduleKey,
      moduleName: mod.name,
      ...optionToFeature(mod, opt),
    })),
  );
}
