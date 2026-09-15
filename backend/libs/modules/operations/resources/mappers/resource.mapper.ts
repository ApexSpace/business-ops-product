import {
  Resource,
  ResourceAvailability,
  ResourceGroup,
  ResourceScheduleException,
} from '@prisma/client';
import {
  ResourceAvailabilityResponseDto,
  ResourceScheduleExceptionResponseDto,
} from '../dto/resource-workspace.dto';
import {
  ResourceListItemResponseDto,
  ResourcePickerItemResponseDto,
} from '../dto/resource.dto';
import { ResourceGroupResponseDto } from '../dto/resource-group.dto';

export type ResourceListRow = Resource & {
  group?: Pick<ResourceGroup, 'name'> | null;
};

export function toResourceGroupResponse(
  group: ResourceGroup,
  resourceCount = 0,
): ResourceGroupResponseDto {
  return {
    id: group.id,
    businessId: group.businessId,
    name: group.name,
    sortOrder: group.sortOrder,
    resourceCount,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export function toResourceListItemResponse(
  resource: ResourceListRow,
): ResourceListItemResponseDto {
  return {
    id: resource.id,
    businessId: resource.businessId,
    groupId: resource.groupId,
    groupName: resource.group?.name ?? null,
    name: resource.name,
    resourceType: resource.resourceType,
    capacity: resource.capacity,
    alwaysAvailable: resource.alwaysAvailable,
    status: resource.status,
    sortOrder: resource.sortOrder,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

export function toResourcePickerItem(
  resource: ResourceListRow,
): ResourcePickerItemResponseDto {
  return {
    id: resource.id,
    name: resource.name,
    resourceType: resource.resourceType,
    groupName: resource.group?.name ?? null,
  };
}

export function toAvailabilityResponse(
  row: ResourceAvailability,
): ResourceAvailabilityResponseDto {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    isEnabled: row.isEnabled,
  };
}

export function toScheduleExceptionResponse(
  row: ResourceScheduleException,
): ResourceScheduleExceptionResponseDto {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    startTime: row.startTime,
    endTime: row.endTime,
    isUnavailable: row.isUnavailable,
    reason: row.reason,
  };
}
