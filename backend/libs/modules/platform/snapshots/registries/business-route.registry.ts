/** Allowed business app routes for snapshot navigation and dashboard quick links. */
export const BUSINESS_ROUTE_REGISTRY = new Set<string>([
  '/business/dashboard',
  '/business/contacts',
  '/business/conversations',
  '/business/pipelines',
  '/business/leads',
  '/business/work-items',
  '/business/appointments',
  '/business/payments',
  '/business/settings/profile',
  '/business/settings/team',
  '/business/settings/calendars',
  '/business/settings/services',
  '/business/settings/pipelines',
  '/business/settings/financial',
  '/business/settings/templates',
  '/business/settings/chatbots',
  '/business/settings/automations',
  '/business/settings/billing',
  '/business/settings/integrations',
  '/business/settings/notifications',
  '/business/settings/appearance',
]);

export function isAllowedBusinessRoute(route: string): boolean {
  return BUSINESS_ROUTE_REGISTRY.has(route);
}
