import type { DashboardWidgetKey } from "./widget-registry";

/** KPI row on the CodeSol dashboard draft (four cards, no subtitles). */
export const DASHBOARD_DRAFT_WIDGET_KEYS: DashboardWidgetKey[] = [
  "appointments",
  "contacts",
  "conversations",
  "wonDeals",
];

export const DASHBOARD_DRAFT_WIDGET_LABELS: Partial<
  Record<DashboardWidgetKey, string>
> = {
  appointments: "Appointments",
  contacts: "New contacts",
  conversations: "Conversations",
  wonDeals: "Won deals",
};
