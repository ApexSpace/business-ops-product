import {
  Capability,
  CapabilityConfigSchema,
  CapabilityFeature,
  CapabilityFeatureAssignment,
  CapabilityLimit,
  CapabilityModule,
  CapabilityNavigationItem,
  CapabilityPermission,
  Prisma,
  RegistryFeature,
} from '@prisma/client';
import {
  AssignedCapabilityFeatureDto,
  CapabilityConfigSchemaResponseDto,
  CapabilityDetailDto,
  CapabilityFeatureResponseDto,
  CapabilityLimitResponseDto,
  CapabilityListItemDto,
  CapabilityModuleResponseDto,
  CapabilityNavigationResponseDto,
  CapabilityPermissionResponseDto,
  RegistryAvailableFeatureDto,
  RegistryFeatureDto,
} from '../dto';
import type { FeatureAssignmentWithRegistry } from '../repositories/capability.repository';

type CapabilityWithCounts = Capability & {
  _count: {
    moduleAssignments: number;
    featureAssignments: number;
    permissions: number;
    limits: number;
    navigationItems: number;
    configSchemas: number;
  };
};

function jsonRecord(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return null;
}

function toCapabilityCounts(row: CapabilityWithCounts['_count']) {
  return {
    modules: row.moduleAssignments,
    features: row.featureAssignments,
    permissions: row.permissions,
    limits: row.limits,
    navigationItems: row.navigationItems,
    configSchemas: row.configSchemas,
  };
}

export function toRegistryFeature(row: RegistryFeature): RegistryFeatureDto {
  const routeKeys = Array.isArray(row.routeKeys)
    ? (row.routeKeys as string[])
    : undefined;
  return {
    key: row.key,
    moduleKey: row.moduleKey,
    moduleName: row.moduleName,
    name: row.name,
    description: row.description,
    permissionKey: row.permissionKey,
    routeKeys,
    icon: row.icon,
    defaultEnabled: row.defaultEnabled,
    isBillable: row.isBillable,
    limitKey: row.limitKey,
    source: row.source,
    status: row.status,
  };
}

export function toRegistryAvailableFeature(
  row: RegistryFeature,
  assignment?: CapabilityFeatureAssignment | null,
): RegistryAvailableFeatureDto {
  const base = toRegistryFeature(row);
  return {
    ...base,
    assigned: !!assignment,
    assignmentId: assignment?.id,
    assignmentStatus: assignment?.status,
  };
}

export function toAssignedCapabilityFeature(
  row: FeatureAssignmentWithRegistry,
): AssignedCapabilityFeatureDto {
  return {
    assignmentId: row.id,
    capabilityId: row.capabilityId,
    featureKey: row.featureKey,
    status: row.status,
    sortOrder: row.sortOrder,
    metadata: jsonRecord(row.metadata),
    registry: toRegistryFeature(row.feature),
  };
}

export function toCapabilityListItem(
  row: CapabilityWithCounts,
): CapabilityListItemDto {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    icon: row.icon,
    status: row.status,
    sortOrder: row.sortOrder,
    metadata: jsonRecord(row.metadata),
    _count: toCapabilityCounts(row._count),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export function toCapabilityDetail(
  row: CapabilityWithCounts,
): CapabilityDetailDto {
  return toCapabilityListItem(row);
}

export function toCapabilityModule(
  row: CapabilityModule,
): CapabilityModuleResponseDto {
  return {
    id: row.id,
    capabilityId: row.capabilityId,
    key: row.key,
    name: row.name,
    description: row.description,
    status: row.status,
    sortOrder: row.sortOrder,
    metadata: jsonRecord(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCapabilityFeature(
  row: CapabilityFeature,
): CapabilityFeatureResponseDto {
  return {
    id: row.id,
    capabilityId: row.capabilityId,
    moduleId: row.moduleId,
    key: row.key,
    name: row.name,
    description: row.description,
    status: row.status,
    source: row.source,
    defaultEnabled: row.defaultEnabled,
    isBillable: row.isBillable,
    permissionKey: row.permissionKey,
    limitKey: row.limitKey,
    metadata: jsonRecord(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCapabilityPermission(
  row: CapabilityPermission,
): CapabilityPermissionResponseDto {
  return {
    id: row.id,
    capabilityId: row.capabilityId,
    featureId: row.featureId,
    key: row.key,
    name: row.name,
    description: row.description,
    metadata: jsonRecord(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCapabilityLimit(
  row: CapabilityLimit,
): CapabilityLimitResponseDto {
  return {
    id: row.id,
    capabilityId: row.capabilityId,
    key: row.key,
    name: row.name,
    description: row.description,
    unit: row.unit,
    defaultValue: row.defaultValue,
    metadata: jsonRecord(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCapabilityNavigation(
  row: CapabilityNavigationItem,
): CapabilityNavigationResponseDto {
  return {
    id: row.id,
    capabilityId: row.capabilityId,
    moduleId: row.moduleId,
    key: row.key,
    label: row.label,
    route: row.route,
    icon: row.icon,
    status: row.status,
    sortOrder: row.sortOrder,
    requiredFeatureKey: row.requiredFeatureKey,
    requiredPermissionKey: row.requiredPermissionKey,
    metadata: jsonRecord(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCapabilityConfigSchema(
  row: CapabilityConfigSchema,
): CapabilityConfigSchemaResponseDto {
  return {
    id: row.id,
    capabilityId: row.capabilityId,
    schemaKey: row.schemaKey,
    name: row.name,
    description: row.description,
    schemaJson: jsonRecord(row.schemaJson) ?? {},
    defaultConfigJson: jsonRecord(row.defaultConfigJson),
    metadata: jsonRecord(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
