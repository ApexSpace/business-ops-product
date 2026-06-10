export type CapabilityStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "DEPRECATED";

export type CapabilityModuleStatus = "ACTIVE" | "INACTIVE";

export type CapabilityFeatureStatus =
  | "INTERNAL"
  | "BETA"
  | "ACTIVE"
  | "DISABLED"
  | "DEPRECATED";

export type CapabilityFeatureSource = "CODE" | "MANUAL";

export type CapabilityNavigationStatus = "ACTIVE" | "INACTIVE";

export interface CapabilityCounts {
  modules: number;
  features: number;
  permissions: number;
  limits?: number;
  navigationItems?: number;
  configSchemas?: number;
}

export interface CapabilityListItem {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  status: CapabilityStatus;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  _count?: CapabilityCounts;
}

export interface CapabilityDetail extends CapabilityListItem {
  _count: CapabilityCounts;
}

export interface CapabilityStats {
  total: number;
  active: number;
  draft: number;
  inactiveDeprecated: number;
}

export interface RegistryFeature {
  key: string;
  moduleKey: string;
  moduleName: string;
  name: string;
  description?: string | null;
  permissionKey?: string | null;
  routeKeys?: string[];
  icon?: string | null;
  defaultEnabled: boolean;
  isBillable: boolean;
  limitKey?: string | null;
  source: CapabilityFeatureSource;
  status: CapabilityFeatureStatus;
}

export interface RegistryModuleOption {
  key: string;
  name: string;
  description: string;
  group?: string | null;
}

/** Flat platform module from the code catalog. */
export interface RegistryModuleCatalog {
  moduleKey: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  featureCount: number;
  availableOptions: RegistryModuleOption[];
}

export type ModuleOptions = Record<string, boolean>;

export interface ModuleSelection {
  enabled: boolean;
  options: ModuleOptions;
}

export type ModuleSelections = Record<string, ModuleSelection>;

export interface ModuleOptionSelections {
  moduleKey: string;
  options: ModuleOptions;
}

/** @deprecated Use ModuleOptionSelections */
export type CapabilityModuleSyncItem = ModuleOptionSelections;

/** @deprecated Use RegistryModuleCatalog — nested features are internal only. */
export interface RegistryModule {
  moduleKey: string;
  moduleName: string;
  features: RegistryFeature[];
}

export interface AssignedCapabilityModule {
  moduleKey: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  createdAt: string;
  options: ModuleOptions;
  enabled: boolean;
}

export interface RegistryAvailableFeature extends RegistryFeature {
  assigned: boolean;
  assignmentId?: string;
  assignmentStatus?: CapabilityFeatureStatus;
}

export interface AssignedCapabilityFeature {
  assignmentId: string;
  capabilityId: string;
  featureKey: string;
  status: CapabilityFeatureStatus;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
  registry: RegistryFeature;
}

export interface DerivedCapabilityModule {
  moduleKey: string;
  moduleName: string;
  featureCount: number;
  features: RegistryAvailableFeature[];
}

export interface CapabilityModule {
  id: string;
  capabilityId: string;
  key: string;
  name: string;
  description?: string | null;
  status: CapabilityModuleStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** @deprecated Legacy shape — use AssignedCapabilityFeature */
export interface CapabilityFeature {
  id: string;
  capabilityId: string;
  moduleId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  status: CapabilityFeatureStatus;
  source: CapabilityFeatureSource;
  defaultEnabled: boolean;
  isBillable: boolean;
  permissionKey?: string | null;
  limitKey?: string | null;
  metadata?: Record<string, unknown> | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CapabilityPermission {
  id: string;
  capabilityId: string;
  featureId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CapabilityLimit {
  id: string;
  capabilityId: string;
  key: string;
  name: string;
  description?: string | null;
  unit: string;
  defaultValue: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CapabilityNavigationItem {
  id: string;
  capabilityId: string;
  moduleId?: string | null;
  key: string;
  label: string;
  route: string;
  icon?: string | null;
  requiredFeatureKey?: string | null;
  requiredPermissionKey?: string | null;
  status: CapabilityNavigationStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CapabilityConfigSchema {
  id: string;
  capabilityId: string;
  schemaKey: string;
  name?: string | null;
  description?: string | null;
  schemaJson: Record<string, unknown>;
  defaultConfigJson?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CapabilityRegistryDiffEntry {
  key: string;
  name?: string;
  field?: string;
  registryValue?: unknown;
  dbValue?: unknown;
  message?: string;
}

export interface CapabilityRegistryDiff {
  dryRun?: boolean;
  availableInCode?: Array<string | CapabilityRegistryDiffEntry>;
  missingInDb: Array<string | CapabilityRegistryDiffEntry>;
  missingInCode: Array<string | CapabilityRegistryDiffEntry>;
  drifted: Array<string | CapabilityRegistryDiffEntry>;
  synced: Array<string | CapabilityRegistryDiffEntry>;
  warnings?: string[];
}

export interface BulkAssignResult {
  assigned: string[];
  skipped: string[];
}

export interface CapabilityRegistrySyncResult extends CapabilityRegistryDiff {
  dryRun?: boolean;
}
