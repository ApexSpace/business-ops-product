export const DASHBOARD_WIDGET_REGISTRY = new Set<string>([
  'leads',
  'contacts',
  'appointments',
  'conversations',
  'workItems',
  'workItemsCompleted',
  'pipelines',
  'wonDeals',
  'teamMembers',
]);

export const DASHBOARD_WIDGET_LABEL_KEYS: Record<string, string> = {
  leads: 'dashboard.leads',
  contacts: 'dashboard.contacts',
  appointments: 'dashboard.appointments',
  conversations: 'dashboard.conversations',
  workItems: 'dashboard.workItems',
  workItemsCompleted: 'dashboard.workItemsCompleted',
  pipelines: 'dashboard.pipelines',
  wonDeals: 'dashboard.wonDeals',
  teamMembers: 'dashboard.teamMembers',
};

export function isAllowedDashboardWidget(key: string): boolean {
  return DASHBOARD_WIDGET_REGISTRY.has(key);
}
