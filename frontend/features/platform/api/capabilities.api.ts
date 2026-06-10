import { api } from "@/lib/api/client";
import type {
  AssignedCapabilityFeature,
  BulkAssignResult,
  CapabilityConfigSchema,
  CapabilityDetail,
  CapabilityLimit,
  CapabilityNavigationItem,
  CapabilityListItem,
  CapabilityPermission,
  CapabilityRegistryDiff,
  CapabilityRegistrySyncResult,
  CapabilityStats,
  AssignedCapabilityModule,
  CapabilityModuleSyncItem,
  RegistryAvailableFeature,
  RegistryModuleCatalog,
} from "@/features/platform/types/capability";
import type { PaginatedResult } from "@/features/platform/types";

export type PlatformCapabilitiesListFilters = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};

export async function listPlatformCapabilities(
  filters: PlatformCapabilitiesListFilters = {},
): Promise<PaginatedResult<CapabilityListItem>> {
  const { items, meta } = await api.getPaginated<CapabilityListItem>(
    "platform/capabilities",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        search: filters.search,
      },
    },
  );
  return { items, meta };
}

export function getPlatformCapabilityStats() {
  return api.get<CapabilityStats>("platform/capabilities/stats");
}

export function getPlatformCapability(id: string) {
  return api.get<CapabilityDetail>(`platform/capabilities/${id}`);
}

export function createPlatformCapability(body: Record<string, unknown>) {
  return api.post<CapabilityDetail>("platform/capabilities", body);
}

export function updatePlatformCapability(
  id: string,
  body: Record<string, unknown>,
) {
  return api.patch<CapabilityDetail>(`platform/capabilities/${id}`, body);
}

export function deletePlatformCapability(id: string) {
  return api.delete<void>(`platform/capabilities/${id}`);
}

export function activatePlatformCapability(id: string) {
  return api.post<CapabilityDetail>(`platform/capabilities/${id}/activate`);
}

/** Publish a draft capability (sets status to ACTIVE). */
export function publishPlatformCapability(id: string) {
  return activatePlatformCapability(id);
}

/** Move a published capability back to draft. */
export function movePlatformCapabilityToDraft(id: string) {
  return updatePlatformCapability(id, { status: "DRAFT" });
}

// --- Global module catalog ---

export function getPlatformRegistryModules() {
  return api.get<RegistryModuleCatalog[]>(
    "platform/capabilities/registry/modules",
  );
}

export function getPlatformRegistryDiff() {
  return api.get<CapabilityRegistryDiff>("platform/capabilities/registry");
}

export function syncPlatformRegistry(body?: { dryRun?: boolean }) {
  return api.post<CapabilityRegistrySyncResult>(
    "platform/capabilities/sync-registry",
    body,
  );
}

// --- Capability feature assignments ---

export function getPlatformCapabilityAvailableFeatures(capabilityId: string) {
  return api.get<RegistryAvailableFeature[]>(
    `platform/capabilities/${capabilityId}/available-features`,
  );
}

export function listPlatformCapabilityAssignedFeatures(capabilityId: string) {
  return api.get<AssignedCapabilityFeature[]>(
    `platform/capabilities/${capabilityId}/features`,
  );
}

export function assignPlatformCapabilityFeatures(
  capabilityId: string,
  featureKeys: string[],
) {
  return api.post<BulkAssignResult>(
    `platform/capabilities/${capabilityId}/features/assign`,
    { featureKeys },
  );
}

export function unassignPlatformCapabilityFeature(
  capabilityId: string,
  featureKey: string,
) {
  return api.delete<void>(
    `platform/capabilities/${capabilityId}/features/${encodeURIComponent(featureKey)}`,
  );
}

export function updatePlatformCapabilityFeatureAssignment(
  capabilityId: string,
  featureKey: string,
  body: Record<string, unknown>,
) {
  return api.patch<AssignedCapabilityFeature>(
    `platform/capabilities/${capabilityId}/features/${encodeURIComponent(featureKey)}`,
    body,
  );
}

export function createPlatformCapabilityManualFeature(
  capabilityId: string,
  body: Record<string, unknown>,
) {
  return api.post<AssignedCapabilityFeature>(
    `platform/capabilities/${capabilityId}/features/manual`,
    body,
  );
}

export function listPlatformCapabilityModules(capabilityId: string) {
  return api.get<AssignedCapabilityModule[]>(
    `platform/capabilities/${capabilityId}/modules`,
  );
}

export function assignPlatformCapabilityModules(
  capabilityId: string,
  moduleKeys: string[],
) {
  return api.post<{ assigned: string[]; skipped: string[] }>(
    `platform/capabilities/${capabilityId}/modules/assign`,
    { moduleKeys },
  );
}

export function syncPlatformCapabilityModules(
  capabilityId: string,
  modules: CapabilityModuleSyncItem[],
) {
  return api.post<{ assigned: string[]; unassigned: string[] }>(
    `platform/capabilities/${capabilityId}/modules/sync`,
    { modules },
  );
}

export function unassignPlatformCapabilityModule(
  capabilityId: string,
  moduleKey: string,
) {
  return api.delete<void>(
    `platform/capabilities/${capabilityId}/modules/${encodeURIComponent(moduleKey)}`,
  );
}

// --- Permissions ---

export function listPlatformCapabilityPermissions(capabilityId: string) {
  return api.get<CapabilityPermission[]>(
    `platform/capabilities/${capabilityId}/permissions`,
  );
}

export function createPlatformCapabilityPermission(
  capabilityId: string,
  body: Record<string, unknown>,
) {
  return api.post<CapabilityPermission>(
    `platform/capabilities/${capabilityId}/permissions`,
    body,
  );
}

export function updatePlatformCapabilityPermission(
  capabilityId: string,
  permissionId: string,
  body: Record<string, unknown>,
) {
  return api.patch<CapabilityPermission>(
    `platform/capabilities/${capabilityId}/permissions/${permissionId}`,
    body,
  );
}

export function deletePlatformCapabilityPermission(
  capabilityId: string,
  permissionId: string,
) {
  return api.delete<void>(
    `platform/capabilities/${capabilityId}/permissions/${permissionId}`,
  );
}

// --- Limits ---

export function listPlatformCapabilityLimits(capabilityId: string) {
  return api.get<CapabilityLimit[]>(
    `platform/capabilities/${capabilityId}/limits`,
  );
}

export function createPlatformCapabilityLimit(
  capabilityId: string,
  body: Record<string, unknown>,
) {
  return api.post<CapabilityLimit>(
    `platform/capabilities/${capabilityId}/limits`,
    body,
  );
}

export function updatePlatformCapabilityLimit(
  capabilityId: string,
  limitId: string,
  body: Record<string, unknown>,
) {
  return api.patch<CapabilityLimit>(
    `platform/capabilities/${capabilityId}/limits/${limitId}`,
    body,
  );
}

export function deletePlatformCapabilityLimit(
  capabilityId: string,
  limitId: string,
) {
  return api.delete<void>(
    `platform/capabilities/${capabilityId}/limits/${limitId}`,
  );
}

// --- Navigation ---

export function listPlatformCapabilityNavigation(capabilityId: string) {
  return api.get<CapabilityNavigationItem[]>(
    `platform/capabilities/${capabilityId}/navigation`,
  );
}

export function createPlatformCapabilityNavigationItem(
  capabilityId: string,
  body: Record<string, unknown>,
) {
  return api.post<CapabilityNavigationItem>(
    `platform/capabilities/${capabilityId}/navigation`,
    body,
  );
}

export function updatePlatformCapabilityNavigationItem(
  capabilityId: string,
  navigationId: string,
  body: Record<string, unknown>,
) {
  return api.patch<CapabilityNavigationItem>(
    `platform/capabilities/${capabilityId}/navigation/${navigationId}`,
    body,
  );
}

export function deletePlatformCapabilityNavigationItem(
  capabilityId: string,
  navigationId: string,
) {
  return api.delete<void>(
    `platform/capabilities/${capabilityId}/navigation/${navigationId}`,
  );
}

// --- Config schemas ---

export function listPlatformCapabilityConfigSchemas(capabilityId: string) {
  return api.get<CapabilityConfigSchema[]>(
    `platform/capabilities/${capabilityId}/config-schemas`,
  );
}

export function createPlatformCapabilityConfigSchema(
  capabilityId: string,
  body: Record<string, unknown>,
) {
  return api.post<CapabilityConfigSchema>(
    `platform/capabilities/${capabilityId}/config-schemas`,
    body,
  );
}

export function updatePlatformCapabilityConfigSchema(
  capabilityId: string,
  schemaId: string,
  body: Record<string, unknown>,
) {
  return api.patch<CapabilityConfigSchema>(
    `platform/capabilities/${capabilityId}/config-schemas/${schemaId}`,
    body,
  );
}

export function deletePlatformCapabilityConfigSchema(
  capabilityId: string,
  schemaId: string,
) {
  return api.delete<void>(
    `platform/capabilities/${capabilityId}/config-schemas/${schemaId}`,
  );
}
