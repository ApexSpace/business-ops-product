import { api } from "@/lib/api/client";
import type {
  ResourceAvailabilitySlot,
  ResourceGroup,
  ResourceListItem,
  ResourcePickerItem,
  ResourceScheduleException,
  ResourceWorkspace,
  ServiceResourceType,
} from "@/features/resources/types";

export function listResourceGroups() {
  return api.get<ResourceGroup[]>("resource-groups");
}

export function createResourceGroup(body: { name: string }) {
  return api.post<ResourceGroup>("resource-groups", body);
}

export function updateResourceGroup(id: string, body: { name: string }) {
  return api.patch<ResourceGroup>(`resource-groups/${id}`, body);
}

export function deleteResourceGroup(id: string) {
  return api.delete<void>(`resource-groups/${id}?confirm=true`);
}

export function reorderResourceGroups(orderedIds: string[]) {
  return api.post<ResourceGroup[]>("resource-groups/reorder", { orderedIds });
}

export function listResources(filters?: {
  groupId?: string;
  resourceType?: ServiceResourceType;
  search?: string;
}) {
  return api.get<ResourceListItem[]>("resources", {
    searchParams: filters,
  });
}

export function listResourcePicker(search?: string) {
  return api.get<ResourcePickerItem[]>("resources/picker", {
    searchParams: search ? { search } : undefined,
  });
}

export function getResourceWorkspace(resourceId: string) {
  return api.get<ResourceWorkspace>(`resources/${resourceId}/workspace`);
}

export function createResource(body: {
  name: string;
  resourceType: ServiceResourceType;
  groupId?: string | null;
  description?: string | null;
}) {
  return api.post<ResourceListItem>("resources", body);
}

export function updateResource(
  id: string,
  body: Record<string, unknown>,
) {
  return api.patch<ResourceListItem>(`resources/${id}`, body);
}

export function deleteResource(id: string) {
  return api.delete<void>(`resources/${id}?confirm=true`);
}

export function replaceResourceAvailability(
  resourceId: string,
  slots: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isEnabled?: boolean;
  }>,
) {
  return api.put<ResourceAvailabilitySlot[]>(
    `resources/${resourceId}/availability`,
    { slots },
  );
}

export function createResourceScheduleException(
  resourceId: string,
  body: {
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    isUnavailable?: boolean;
    reason?: string | null;
  },
) {
  return api.post<ResourceScheduleException>(
    `resources/${resourceId}/schedule-exceptions`,
    body,
  );
}

export function deleteResourceScheduleException(
  resourceId: string,
  exceptionId: string,
) {
  return api.delete<void>(
    `resources/${resourceId}/schedule-exceptions/${exceptionId}`,
  );
}
