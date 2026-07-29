/** String icon keys mapped to Lucide icons on the frontend. */
export const BUSINESS_ICON_REGISTRY = new Set<string>([
  'layout-dashboard',
  'contact',
  'message-square',
  'git-branch',
  'clipboard-list',
  'calendar',
  'clock',
  'credit-card',
  'shopping-bag',
  'package',
  'settings',
  'users',
  'briefcase',
  'receipt',
  'file-text',
  'zap',
  'plug',
  'bell',
  'palette',
  'target',
  'scale',
  'wrench',
  'stethoscope',
]);

export function isAllowedBusinessIcon(icon: string): boolean {
  return BUSINESS_ICON_REGISTRY.has(icon);
}
