export type StaffPermissionKey = (typeof STAFF_PERMISSION_KEYS)[number];

export const STAFF_PERMISSION_KEYS = [
  'appointments.access',
  'appointments.change_status',
  'appointments.manage_own',
  'appointments.view_all_calendars',
  'appointments.manage_all',
  'appointments.manage_own_time_blocks',
  'appointments.manage_all_time_blocks',
  'appointments.manage_waitlist',
  'appointments.view_history',
  'contacts.access',
  'contacts.view_last_names',
  'contacts.view_contact_details',
  'contacts.manage',
  'contacts.delete_merge',
  'contacts.adjust_balances',
  'work_items.access',
  'work_items.manage',
  'social_planner.access',
  'social_planner.manage',
  'pipelines.access',
  'pipelines.manage',
  'conversations.access',
  'conversations.view_all',
  'conversations.send',
  'sales.access',
  'sales.view_on_calendar',
  'sales.view_own',
  'sales.view_all',
  'sales.checkout',
  'sales.sell_non_retail',
  'sales.refund',
  'sales.refund_open',
  'payments.access',
  'payments.manage',
  'products.access',
  'products.manage',
  'gift_cards.access',
  'gift_cards.manage',
  'packages.access',
  'packages.manage',
  'memberships.access',
  'memberships.manage',
  'offers.access',
  'offers.manage',
  'forms.view_own_submissions',
  'forms.view_all_submissions',
  'forms.manage_templates',
  'automations.manage',
  'time_clock.access',
  'time_cards.manage',
  'reports.access',
  'settings.services.manage',
  'settings.calendars.manage',
  'settings.online_booking.manage',
  'settings.integrations.manage',
  'settings.team.manage',
] as const;

export type StaffPermissionGroup = {
  id: string;
  label: string;
  permissions: Array<{
    key: StaffPermissionKey;
    label: string;
    description: string;
  }>;
};

export const STAFF_PERMISSION_GROUPS: StaffPermissionGroup[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    permissions: [
      {
        key: 'appointments.access',
        label: 'Can access calendar',
        description: 'Open the appointments calendar app.',
      },
      {
        key: 'appointments.change_status',
        label: 'Can change status of appointments',
        description:
          'Confirm/unconfirm appointments, check in clients, etc. Does not allow canceling appointments.',
      },
      {
        key: 'appointments.manage_own',
        label: 'Can book and change own appointments',
        description:
          'Book, change, and cancel appointments on their own calendar.',
      },
      {
        key: 'appointments.view_all_calendars',
        label: "Can view other people's calendars",
        description:
          "Viewing only. Does not allow changing appointments or time blocks on other people's calendars.",
      },
      {
        key: 'appointments.manage_all',
        label: "Can book and change other people's appointments",
        description:
          'Book, change, and cancel appointments where another staff member is assigned.',
      },
      {
        key: 'appointments.manage_own_time_blocks',
        label: 'Can create and change own time blocks',
        description:
          'Add, change, and remove time blocks on their own calendar.',
      },
      {
        key: 'appointments.manage_all_time_blocks',
        label: "Can create and change other people's time blocks",
        description:
          "Add, change, and remove time blocks on other people's calendars.",
      },
      {
        key: 'appointments.manage_waitlist',
        label: 'Can manage waitlist',
        description: 'Add, change, and remove waitlist entries.',
      },
      {
        key: 'appointments.view_history',
        label: 'Can view appointment change history',
        description:
          'View a record of changes made to appointments, such as status updates, reschedules, and edits.',
      },
    ],
  },
  {
    id: 'contacts',
    label: 'Contacts',
    permissions: [
      {
        key: 'contacts.access',
        label: 'Can open contact profiles',
        description:
          'Open contact detail pages from the contacts list or when linked from other apps (for example appointments).',
      },
      {
        key: 'contacts.view_last_names',
        label: "Can view clients' last names",
        description:
          "Disable this permission to hide clients' last names from this staff member and remove access to the clients list.",
      },
      {
        key: 'contacts.view_contact_details',
        label: "Can access clients' contact details",
        description:
          'Disable this permission to hide any client contact details (i.e. phone number, email address) from this staff member.',
      },
      {
        key: 'contacts.manage',
        label: 'Can create and edit contacts',
        description: 'Create new contacts and edit contact profile fields.',
      },
      {
        key: 'contacts.delete_merge',
        label: 'Can delete and merge clients',
        description:
          'Allows deleting or merging any clients this staff member can access. Does not affect client visibility.',
      },
      {
        key: 'contacts.adjust_balances',
        label: 'Can manually adjust client account balances',
        description: "Manually increase or decrease a client's account balance.",
      },
    ],
  },
  {
    id: 'work_items',
    label: 'Work items',
    permissions: [
      {
        key: 'work_items.access',
        label: 'Can access work items',
        description: 'View the work items workspace.',
      },
      {
        key: 'work_items.manage',
        label: 'Can manage work items',
        description: 'Create, edit, and assign work items.',
      },
    ],
  },
  {
    id: 'social_planner',
    label: 'Social Planner',
    permissions: [
      {
        key: 'social_planner.access',
        label: 'Can access Social Planner',
        description: 'View the social planner calendar and posts.',
      },
      {
        key: 'social_planner.manage',
        label: 'Can manage Social Planner posts',
        description: 'Create, schedule, publish, and manage social posts.',
      },
    ],
  },
  {
    id: 'pipelines',
    label: 'Pipeline',
    permissions: [
      {
        key: 'pipelines.access',
        label: 'Can access pipeline',
        description: 'View the CRM pipeline workspace.',
      },
      {
        key: 'pipelines.manage',
        label: 'Can manage pipeline',
        description: 'Move leads and manage pipeline stages.',
      },
    ],
  },
  {
    id: 'conversations',
    label: 'Conversations',
    permissions: [
      {
        key: 'conversations.access',
        label: 'Can access conversations',
        description:
          'Open the conversations inbox and view conversations assigned to this person.',
      },
      {
        key: 'conversations.view_all',
        label: 'Can view all conversations',
        description:
          'View conversations for all contacts, not only those assigned to this person. Does not allow sending.',
      },
      {
        key: 'conversations.send',
        label: 'Can send messages',
        description:
          'Send messages in conversations this person can view.',
      },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    permissions: [
      {
        key: 'sales.view_on_calendar',
        label: 'Can view individual sales on calendar',
        description:
          'View the attached sale for appointments that are visible to this person. Does not grant access to the Sales app.',
      },
      {
        key: 'sales.view_own',
        label: 'Can view list of own sales',
        description: 'Grants access to the list of their own sales.',
      },
      {
        key: 'sales.view_all',
        label: 'Can view all sales',
        description:
          'Viewing only. Grants access to the Sales app. Does not allow modifying of sales.',
      },
      {
        key: 'sales.checkout',
        label: 'Can start a checkout and modify sales',
        description:
          'Take payments, reopen closed sales, make changes to services and products in a sale, etc.',
      },
      {
        key: 'sales.sell_non_retail',
        label: 'Can sell non-retail products',
        description:
          "Add products from 'non-retail' categories during checkout. Can be helpful for tracking internal product usage (professional-use items).",
      },
      {
        key: 'sales.refund',
        label: 'Can refund sales (open and closed)',
        description:
          'Allow refunding items or entire sales, whether they are open or closed. Grants full refund capabilities.',
      },
      {
        key: 'sales.refund_open',
        label: 'Can refund open sales',
        description:
          'Allow refunding payments during checkout or on a re-opened sale.',
      },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    permissions: [
      {
        key: 'payments.access',
        label: 'Can access payments',
        description: 'View payments and estimates.',
      },
      {
        key: 'payments.manage',
        label: 'Can manage payments',
        description: 'Record payments and manage estimates.',
      },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    permissions: [
      {
        key: 'products.access',
        label: 'Can access products',
        description: 'View the products catalog.',
      },
      {
        key: 'products.manage',
        label: 'Can manage products',
        description: 'Create, edit, and adjust product inventory.',
      },
    ],
  },
  {
    id: 'gift_cards',
    label: 'Gift cards',
    permissions: [
      {
        key: 'gift_cards.access',
        label: 'Can access gift cards',
        description: 'View gift cards.',
      },
      {
        key: 'gift_cards.manage',
        label: 'Can manage gift cards',
        description: 'Create and adjust gift cards.',
      },
    ],
  },
  {
    id: 'packages',
    label: 'Packages',
    permissions: [
      {
        key: 'packages.access',
        label: 'Can access packages',
        description: 'View client packages.',
      },
      {
        key: 'packages.manage',
        label: 'Can manage packages',
        description: 'Create and modify packages.',
      },
    ],
  },
  {
    id: 'memberships',
    label: 'Memberships',
    permissions: [
      {
        key: 'memberships.access',
        label: 'Can access memberships',
        description: 'View client membership plans and subscriptions.',
      },
      {
        key: 'memberships.manage',
        label: 'Can manage memberships',
        description: 'Start, change, and cancel client memberships.',
      },
    ],
  },
  {
    id: 'offers',
    label: 'Offers',
    permissions: [
      {
        key: 'offers.access',
        label: 'Can access offers',
        description: 'View promotional offers.',
      },
      {
        key: 'offers.manage',
        label: 'Can manage offers',
        description: 'Create and modify offers.',
      },
    ],
  },
  {
    id: 'forms',
    label: 'Forms',
    permissions: [
      {
        key: 'forms.view_own_submissions',
        label: 'Can view own form submissions',
        description:
          'View submissions on appointments visible to this person.',
      },
      {
        key: 'forms.view_all_submissions',
        label: 'Can view all form submissions',
        description: 'Access the forms app and all submissions.',
      },
      {
        key: 'forms.manage_templates',
        label: 'Can manage form templates',
        description: 'Create and edit form templates.',
      },
    ],
  },
  {
    id: 'automations',
    label: 'Automations',
    permissions: [
      {
        key: 'automations.manage',
        label: 'Can manage automations',
        description: 'Create and edit automation workflows.',
      },
    ],
  },
  {
    id: 'time_clock',
    label: 'Time clock',
    permissions: [
      {
        key: 'time_clock.access',
        label: 'Can use time clock',
        description: 'Clock in and out from the time clock kiosk.',
      },
      {
        key: 'time_cards.manage',
        label: 'Can manage time cards',
        description: 'View, edit, and delete time cards for all staff.',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    permissions: [
      {
        key: 'reports.access',
        label: 'Can access company reports',
        description: 'Open Reports, generate previews, and download PDF/Excel.',
      },
    ],
  },
  {
    id: 'setup',
    label: 'Setup & management',
    permissions: [
      {
        key: 'settings.team.manage',
        label: 'Can manage staff members',
        description:
          'Add staff and edit details. Does not include permissions or compensation.',
      },
      {
        key: 'settings.services.manage',
        label: 'Can manage service settings',
        description: 'Create and change services and online booking settings.',
      },
      {
        key: 'settings.calendars.manage',
        label: 'Can manage calendars',
        description: 'Create and configure calendars.',
      },
      {
        key: 'settings.online_booking.manage',
        label: 'Can manage online booking',
        description: 'Configure online booking preferences.',
      },
      {
        key: 'settings.integrations.manage',
        label: 'Can manage integrations',
        description: 'Connect and configure third-party integrations.',
      },
    ],
  },
];

export const DEFAULT_SERVICE_PROVIDER_PERMISSIONS: Partial<
  Record<StaffPermissionKey, boolean>
> = {
  'appointments.access': true,
  'appointments.manage_own': true,
  'appointments.manage_own_time_blocks': true,
  'appointments.change_status': true,
  'time_clock.access': true,
};

export const DEFAULT_MEMBER_PERMISSIONS: Partial<
  Record<StaffPermissionKey, boolean>
> = {
  'time_clock.access': true,
};

export function isStaffPermissionKey(key: string): key is StaffPermissionKey {
  return (STAFF_PERMISSION_KEYS as readonly string[]).includes(key);
}

export function normalizeStaffPermissions(
  raw: unknown,
): Record<StaffPermissionKey, boolean> {
  const result = {} as Record<StaffPermissionKey, boolean>;
  for (const key of STAFF_PERMISSION_KEYS) {
    result[key] = false;
  }
  if (!raw || typeof raw !== 'object') {
    return result;
  }
  const source = raw as Record<string, unknown>;
  for (const [key, value] of Object.entries(source)) {
    if (isStaffPermissionKey(key) && value === true) {
      result[key] = true;
    }
  }

  // Migrate legacy contacts permissions into the Mangomint-style keys.
  if (source['contacts.access'] === true) {
    if (source['contacts.view_last_names'] === undefined) {
      result['contacts.view_last_names'] = true;
    }
    if (source['contacts.view_contact_details'] === undefined) {
      result['contacts.view_contact_details'] = true;
    }
  }
  if (
    source['contacts.manage'] === true &&
    source['contacts.delete_merge'] === undefined
  ) {
    result['contacts.delete_merge'] = true;
  }

  // Migrate legacy sales.access into Mangomint-style sales visibility keys.
  if (source['sales.access'] === true) {
    if (source['sales.view_all'] === undefined) {
      result['sales.view_all'] = true;
    }
    if (source['sales.view_own'] === undefined) {
      result['sales.view_own'] = true;
    }
  }
  if (
    source['sales.refund'] === true &&
    source['sales.refund_open'] === undefined
  ) {
    result['sales.refund_open'] = true;
  }
  // Keep sales.access derived so existing nav/route gates keep working.
  if (result['sales.view_own'] || result['sales.view_all']) {
    result['sales.access'] = true;
  }

  return result;
}

export function mergeStaffPermissions(
  base: Partial<Record<StaffPermissionKey, boolean>>,
  overrides: Partial<Record<StaffPermissionKey, boolean>>,
): Record<StaffPermissionKey, boolean> {
  return normalizeStaffPermissions({ ...base, ...overrides });
}

export function defaultPermissionsForMember(options: {
  isServiceProvider: boolean;
}): Record<StaffPermissionKey, boolean> {
  const base = options.isServiceProvider
    ? DEFAULT_SERVICE_PROVIDER_PERMISSIONS
    : DEFAULT_MEMBER_PERMISSIONS;
  return normalizeStaffPermissions(base);
}

export function hasStaffPermission(
  permissions: Record<string, boolean> | undefined,
  key: StaffPermissionKey,
  businessRole?: string,
): boolean {
  if (businessRole === 'OWNER' || businessRole === 'ADMIN') {
    return true;
  }
  return Boolean(permissions?.[key]);
}

/** View-only access to other staff calendars (does not imply manage). */
export function canViewAllStaffCalendars(
  permissions: Record<string, boolean> | undefined,
  businessRole?: string,
): boolean {
  return hasStaffPermission(
    permissions,
    'appointments.view_all_calendars',
    businessRole,
  );
}

export const NAV_KEY_PERMISSION_MAP: Record<string, StaffPermissionKey> = {
  dashboard: 'appointments.access',
  appointments: 'appointments.access',
  'work-items': 'work_items.access',
  'social-planner': 'social_planner.access',
  pipelines: 'pipelines.access',
  conversations: 'conversations.access',
  contacts: 'contacts.view_last_names',
  sales: 'sales.access',
  'gift-cards': 'gift_cards.access',
  packages: 'packages.access',
  memberships: 'memberships.access',
  products: 'products.access',
  offers: 'offers.access',
  payments: 'payments.access',
  'time-clock': 'time_clock.access',
  'time-cards': 'time_cards.manage',
  reports: 'reports.access',
};

/**
 * Settings sidebar access for MEMBERs.
 * - always: personal preferences any staff can open
 * - admin: OWNER/ADMIN (or platform admin) only
 * - permission key: require that staff permission
 * Unmapped settings hrefs default to admin-only.
 */
export type SettingsHrefAccessRule = StaffPermissionKey | 'always' | 'admin';

export const SETTINGS_HREF_ACCESS: Record<string, SettingsHrefAccessRule> = {
  '/business/settings/appearance': 'always',
  '/business/settings/team': 'settings.team.manage',
  '/business/settings/services': 'settings.services.manage',
  '/business/settings/online-booking': 'settings.online_booking.manage',
  '/business/settings/calendars': 'settings.calendars.manage',
  '/business/settings/integrations': 'settings.integrations.manage',
  '/business/settings/whatsapp': 'settings.integrations.manage',
  '/business/settings/forms': 'forms.manage_templates',
  '/business/settings/automations': 'automations.manage',
  '/business/settings/automation-workflows': 'automations.manage',
  '/business/settings/automation-registry': 'automations.manage',
  '/business/settings/pipelines': 'pipelines.manage',
  '/business/settings/profile': 'admin',
  '/business/settings/resources': 'admin',
  '/business/settings/financial': 'admin',
  '/business/settings/custom-fees': 'admin',
  '/business/settings/checkout-advanced': 'admin',
  '/business/settings/templates': 'admin',
  '/business/settings/billing': 'admin',
  '/business/settings/notifications': 'admin',
  '/business/settings/chatbots': 'admin',
  '/business/settings/data': 'admin',
};

export function resolveSettingsHrefAccessRule(
  pathname: string,
): SettingsHrefAccessRule {
  const normalized = pathname.split('?')[0] ?? pathname;
  const entries = Object.entries(SETTINGS_HREF_ACCESS).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [href, rule] of entries) {
    if (normalized === href || normalized.startsWith(`${href}/`)) {
      return rule;
    }
  }
  return 'admin';
}

export function canAccessSettingsHref(
  pathname: string,
  options: {
    businessRole?: string;
    staffPermissions?: Record<string, boolean>;
    isPlatformAdmin?: boolean;
  },
): boolean {
  if (options.isPlatformAdmin) return true;
  if (
    options.businessRole === 'OWNER' ||
    options.businessRole === 'ADMIN'
  ) {
    return true;
  }
  const rule = resolveSettingsHrefAccessRule(pathname);
  if (rule === 'always') return true;
  if (rule === 'admin') return false;
  return hasStaffPermission(
    options.staffPermissions,
    rule,
    options.businessRole,
  );
}

export const MEMBER_DEFAULT_SETTINGS_HREF = '/business/settings/appearance';
export const ADMIN_DEFAULT_SETTINGS_HREF = '/business/settings/profile';


export const NOTIFICATION_SETTING_KEYS = [
  'appointment.booked',
  'appointment.rescheduled',
  'appointment.cancelled',
] as const;

export type StaffNotificationSettingKey =
  (typeof NOTIFICATION_SETTING_KEYS)[number];

export const DEFAULT_NOTIFICATION_SETTINGS: Record<
  StaffNotificationSettingKey,
  boolean
> = {
  'appointment.booked': true,
  'appointment.rescheduled': true,
  'appointment.cancelled': true,
};

export function normalizeNotificationSettings(
  raw: unknown,
): Record<StaffNotificationSettingKey, boolean> {
  const result = { ...DEFAULT_NOTIFICATION_SETTINGS,
};
  if (!raw || typeof raw !== 'object') {
    return result;
  }
  for (const key of NOTIFICATION_SETTING_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'boolean') {
      result[key] = value;
    }
  }
  return result;
}
