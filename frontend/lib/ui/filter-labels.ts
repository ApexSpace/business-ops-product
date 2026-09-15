import type { SelectOption } from "@/components/forms/select-field";

export type FilterOption = {
  value: string;
  label: string;
};

/**
 * Title Case labels for filter selects, chips, and drawer filter fields.
 * Import from here instead of duplicating "All statuses" strings across features.
 */
export const FILTER_ALL_LABELS = {
  statuses: "All Statuses",
  types: "All Types",
  methods: "All Methods",
  priorities: "All Priorities",
  assignees: "All Assignees",
  services: "All Services",
  staff: "All Staff",
  support: "All Support",
  calendars: "All Calendars",
  time: "All Time",
  categories: "All Categories",
  channels: "All Channels",
  appointments: "All Appointments",
  eventTypes: "All Event Types",
  sources: "All Sources",
  severities: "All Severities",
  paymentTypes: "All Payment Types",
  directions: "All Directions",
} as const;

/** Empty-string value — common in list toolbar filters. */
export function emptyFilterOption(label: string): FilterOption {
  return { value: "", label };
}

/** `"all"` sentinel — common in platform admin filters. */
export function allFilterOption(label: string): SelectOption {
  return { value: "all", label };
}

export const ALL_STATUSES_EMPTY_OPTION = emptyFilterOption(
  FILTER_ALL_LABELS.statuses,
);

export const ALL_STATUSES_ALL_OPTION: FilterOption = {
  value: "all",
  label: FILTER_ALL_LABELS.statuses,
};

export const ALL_TYPES_EMPTY_OPTION = emptyFilterOption(FILTER_ALL_LABELS.types);

export const ALL_METHODS_EMPTY_OPTION = emptyFilterOption(
  FILTER_ALL_LABELS.methods,
);

export const ALL_PRIORITIES_EMPTY_OPTION = emptyFilterOption(
  FILTER_ALL_LABELS.priorities,
);

export const ALL_ASSIGNEES_EMPTY_OPTION = emptyFilterOption(
  FILTER_ALL_LABELS.assignees,
);

export const ALL_SERVICES_EMPTY_OPTION = emptyFilterOption(
  FILTER_ALL_LABELS.services,
);

export const ALL_STAFF_EMPTY_OPTION = emptyFilterOption(FILTER_ALL_LABELS.staff);

export const ALL_SUPPORT_EMPTY_OPTION = emptyFilterOption(
  FILTER_ALL_LABELS.support,
);

export const ALL_CALENDARS_EMPTY_OPTION = emptyFilterOption(
  FILTER_ALL_LABELS.calendars,
);

export const ALL_CATEGORIES_ALL_OPTION: FilterOption = {
  value: "all",
  label: FILTER_ALL_LABELS.categories,
};

/** Contacts options drawer — relative time presets. */
export const CONTACTS_TIME_FILTER_OPTIONS = [
  { value: "all", label: FILTER_ALL_LABELS.time },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
] as const;
