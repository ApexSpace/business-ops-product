import type { RegistryFeatureDefinition } from '../types/capability-registry.types';
import {
  flattenRegistryFeatures,
  REGISTRY_MODULES,
} from './capability-module.registry';

/** Global flat feature catalog — derived from module catalog. */
export const REGISTRY_FEATURES: RegistryFeatureDefinition[] =
  flattenRegistryFeatures();

/** Maps legacy per-capability feature keys to global registry keys. */
export const LEGACY_FEATURE_KEY_MAP: Record<string, string> = {
  'crm.contacts': 'contacts.list',
  'crm.pipelines': 'pipelines.list',
  'crm.leads': 'leads.list',
  'crm.work_items': 'work_items.list',
  'calendar.appointments': 'appointments.list',
  'calendar.calendars': 'calendar.list',
  'payments.invoices': 'payments.invoices.list',
  'payments.list': 'payments.invoices.list',
  'payments.create': 'payments.invoices.create',
  'payments.edit': 'payments.invoices.edit',
  'payments.delete': 'payments.invoices.delete',
  'ai.chatbots': 'ai_agents.list',
  'forms.builder': 'settings.forms.list',
  'forms.submissions': 'settings.forms.list',
  'forms.list': 'settings.forms.list',
  'forms.create': 'settings.forms.create',
  'forms.edit': 'settings.forms.edit',
  'forms.delete': 'settings.forms.delete',
  // CRUD rename (view/update → list/edit)
  'contacts.view': 'contacts.list',
  'contacts.update': 'contacts.edit',
  'contacts.manage': 'contacts.workspace',
  'pipelines.view': 'pipelines.list',
  'pipelines.create': 'pipelines.create',
  'pipelines.update': 'pipelines.edit',
  'pipelines.delete': 'pipelines.delete',
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
  'payments.view': 'payments.invoices.list',
  'payments.update': 'payments.invoices.edit',
  'ai_agents.view': 'ai_agents.list',
  'ai_agents.update': 'ai_agents.edit',
  // Settings integrations — page access retained; per-provider keys are new
  'integrations.manage': 'settings.integrations',
};

export function getRegistryFeatures(): RegistryFeatureDefinition[] {
  return REGISTRY_FEATURES;
}

export function getRegistryFeature(
  featureKey: string,
): RegistryFeatureDefinition | undefined {
  return REGISTRY_FEATURES.find((f) => f.featureKey === featureKey);
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
