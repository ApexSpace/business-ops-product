export type RegistryFeatureDefinition = {
  moduleKey: string;
  moduleName: string;
  featureKey: string;
  featureName: string;
  description?: string;
  permissionKey?: string;
  routeKeys?: string[];
  icon?: string;
  defaultEnabled?: boolean;
  status?: 'INTERNAL' | 'BETA' | 'ACTIVE' | 'DISABLED' | 'DEPRECATED';
  isBillable?: boolean;
  limitKey?: string;
};

export type RegistryModuleGroup = {
  moduleKey: string;
  moduleName: string;
  features: RegistryFeatureDefinition[];
};

export type CapabilityRegistryDiffEntry = {
  key: string;
  name?: string;
  field?: string;
  registryValue?: unknown;
  dbValue?: unknown;
  message?: string;
};

export type CapabilityRegistrySyncReport = {
  dryRun: boolean;
  availableInCode: CapabilityRegistryDiffEntry[];
  synced: CapabilityRegistryDiffEntry[];
  missingInDb: CapabilityRegistryDiffEntry[];
  missingInCode: CapabilityRegistryDiffEntry[];
  drifted: CapabilityRegistryDiffEntry[];
  warnings: string[];
};

export type RegistryAvailableFeature = {
  key: string;
  name: string;
  description?: string | null;
  moduleKey: string;
  moduleName: string;
  permissionKey?: string | null;
  routeKeys?: string[];
  icon?: string | null;
  defaultEnabled: boolean;
  isBillable: boolean;
  limitKey?: string | null;
  source: 'CODE' | 'MANUAL';
  status: string;
  assigned: boolean;
  assignmentId?: string;
  assignmentStatus?: string;
};

export type DerivedCapabilityModule = {
  moduleKey: string;
  moduleName: string;
  featureCount: number;
  features: RegistryAvailableFeature[];
};
