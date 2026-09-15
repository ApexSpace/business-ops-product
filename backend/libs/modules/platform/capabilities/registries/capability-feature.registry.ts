import type { RegistryFeatureDefinition } from '../types/capability-registry.types';
import {
  flattenRegistryFeatures,
  REGISTRY_MODULES,
} from './capability-module.registry';

/** Global flat feature catalog — derived from module catalog. */
export const REGISTRY_FEATURES: RegistryFeatureDefinition[] =
  flattenRegistryFeatures();

/**
 * Maps legacy / renamed feature keys to current registry keys.
 * Applied at entitlement resolution and assignment migration.
 */
export const LEGACY_FEATURE_KEY_MAP: Record<string, string> = {
  // Pre-v2 coarse keys
  'crm.contacts': 'contacts.list',
  'crm.pipelines': 'pipelines.list',
  'crm.leads': 'leads.list',
  'crm.work_items': 'work_items.list',
  'calendar.appointments': 'appointments.list',
  'calendar.calendars': 'calendar.list',
  'ai.chatbots': 'ai_agents.list',
  'integrations.manage': 'settings.integrations',

  // CRUD rename (view/update → list/edit)
  'contacts.view': 'contacts.list',
  'contacts.update': 'contacts.edit',
  'contacts.manage': 'contacts.workspace',
  'pipelines.view': 'pipelines.list',
  'pipelines.update': 'pipelines.edit',
  'work_items.view': 'work_items.list',
  'work_items.update': 'work_items.edit',
  'leads.view': 'leads.list',
  'leads.update': 'leads.edit',
  'conversations.view': 'conversations.inbox',
  'conversations.create': 'conversations.send',
  'conversations.update': 'conversations.send',
  'conversations.delete': 'conversations.send',
  'appointments.view': 'appointments.list',
  'appointments.update': 'appointments.edit',
  'calendar.view': 'calendar.list',
  'calendar.update': 'calendar.edit',
  'ai_agents.view': 'ai_agents.list',
  'ai_agents.update': 'ai_agents.edit',

  // Forms promoted out of settings (v3)
  'settings.forms.list': 'forms.list',
  'settings.forms.create': 'forms.create',
  'settings.forms.edit': 'forms.edit',
  'settings.forms.delete': 'forms.delete',
  'forms.builder': 'forms.list',
  'forms.submissions': 'forms.list',

  // Automations promoted out of settings (v3)
  'settings.automations.list': 'automations.list',
  'settings.automations.create': 'automations.create',
  'settings.automations.edit': 'automations.edit',
  'settings.automations.delete': 'automations.delete',
  'settings.automations.read': 'automations.list',

  // Services promoted out of settings (v3)
  'settings.services': 'services.list',

  // Settings page options removed as duplicates of other modules (v3)
  'settings.calendars': 'calendar.list',
  'settings.pipelines': 'pipelines.stages',
  'settings.chatbots': 'ai_agents.list',

  // Commerce split out of payments (v3)
  'payments.estimates.list': 'estimates.list',
  'payments.estimates.create': 'estimates.create',
  'payments.estimates.edit': 'estimates.edit',
  'payments.estimates.delete': 'estimates.delete',
  'payments.invoices.list': 'invoices.list',
  'payments.invoices.create': 'invoices.create',
  'payments.invoices.edit': 'invoices.edit',
  'payments.invoices.delete': 'invoices.delete',
  'payments.invoices': 'invoices.list',
  'payments.list': 'invoices.list',
  'payments.create': 'invoices.create',
  'payments.edit': 'invoices.edit',
  'payments.delete': 'invoices.delete',
  'payments.view': 'invoices.list',
  'payments.update': 'invoices.edit',
};

/** Normalize a stored or requested feature key to the current registry key. */
export function normalizeFeatureKey(featureKey: string): string {
  let current = featureKey;
  const seen = new Set<string>();
  while (LEGACY_FEATURE_KEY_MAP[current] && !seen.has(current)) {
    seen.add(current);
    current = LEGACY_FEATURE_KEY_MAP[current];
  }
  return current;
}

export function getRegistryFeatures(): RegistryFeatureDefinition[] {
  return REGISTRY_FEATURES;
}

export function getRegistryFeature(
  featureKey: string,
): RegistryFeatureDefinition | undefined {
  const normalized = normalizeFeatureKey(featureKey);
  return (
    REGISTRY_FEATURES.find((f) => f.featureKey === normalized) ??
    REGISTRY_FEATURES.find((f) => f.featureKey === featureKey)
  );
}

export function getAllRegistryFeatureKeys(): Set<string> {
  return new Set(REGISTRY_FEATURES.map((f) => f.featureKey));
}

export function groupRegistryFeaturesByModule(): Map<
  string,
  { moduleName: string; features: RegistryFeatureDefinition[] }
> {
  const groups = new Map<
    string,
    { moduleName: string; features: RegistryFeatureDefinition[] }
  >();
  for (const mod of REGISTRY_MODULES) {
    groups.set(mod.moduleKey, {
      moduleName: mod.name,
      features: mod.options.map((opt) => ({
        moduleKey: mod.moduleKey,
        moduleName: mod.name,
        featureKey: opt.key,
        featureName: opt.name,
        description: opt.description,
        permissionKey: opt.permissionKey,
        routeKeys: opt.routeKeys,
        icon: opt.icon,
        defaultEnabled: opt.defaultEnabled,
        isBillable: opt.isBillable,
      })),
    });
  }
  return groups;
}

export {
  deriveOptionsFromFeatureKeys,
  getAllRegistryModuleKeys,
  getFeatureKeysForEnabledOptions,
  getFeatureKeysForModule,
  getModuleOptions,
  getRegistryModule,
  getRegistryModules,
  REGISTRY_MODULES,
} from './capability-module.registry';
export type { RegistryModuleOption } from './capability-module.registry';
