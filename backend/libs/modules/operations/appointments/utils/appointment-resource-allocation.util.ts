export type ResourceRequirementSelectionMode = 'ALL' | 'SPECIFIC';

export type ResourceRequirementInput = {
  serviceId: string;
  selectionMode: string;
  groupId: string | null;
  resourceId: string | null;
  quantity: number;
  items: Array<{ resourceId: string }>;
};

export type AllocatableResource = {
  id: string;
  groupId: string | null;
  status: string;
  deletedAt: Date | null;
  capacity: number | null;
};

export type ResourceAssignmentQuantity = {
  resourceId: string;
  quantity: number;
};

export type ResolveRequiredResourcesResult =
  | { ok: true; assignments: ResourceAssignmentQuantity[] }
  | { ok: false; reason: 'UNFULFILLABLE' };

function isActiveResource(resource: AllocatableResource | undefined): boolean {
  return Boolean(
    resource && resource.deletedAt == null && resource.status === 'ACTIVE',
  );
}

function requirementQuantity(requirement: ResourceRequirementInput): number {
  return Math.max(1, requirement.quantity || 1);
}

export function mergeAssignmentQuantities(
  assignments: ResourceAssignmentQuantity[],
): ResourceAssignmentQuantity[] {
  const byResource = new Map<string, number>();
  for (const assignment of assignments) {
    const quantity = Math.max(1, assignment.quantity || 1);
    const current = byResource.get(assignment.resourceId) ?? 0;
    byResource.set(assignment.resourceId, Math.max(current, quantity));
  }
  return [...byResource.entries()].map(([resourceId, quantity]) => ({
    resourceId,
    quantity,
  }));
}

export function resolveRequiredResources(params: {
  requirements: ResourceRequirementInput[];
  groupMembersByGroupId: Record<string, AllocatableResource[]>;
  resourcesById: Record<string, AllocatableResource>;
}): ResolveRequiredResourcesResult {
  const collected: ResourceAssignmentQuantity[] = [];

  for (const requirement of params.requirements) {
    const quantity = requirementQuantity(requirement);
    const mode = requirement.selectionMode as ResourceRequirementSelectionMode;

    if (mode === 'ALL') {
      if (!requirement.groupId) {
        const legacy = params.resourcesById[requirement.resourceId ?? ''];
        if (!isActiveResource(legacy) || !requirement.resourceId) {
          return { ok: false, reason: 'UNFULFILLABLE' };
        }
        collected.push({ resourceId: requirement.resourceId, quantity });
        continue;
      }

      const members = (
        params.groupMembersByGroupId[requirement.groupId] ?? []
      ).filter(isActiveResource);
      if (members.length === 0) {
        return { ok: false, reason: 'UNFULFILLABLE' };
      }
      for (const member of members) {
        collected.push({ resourceId: member.id, quantity });
      }
      continue;
    }

    const specificIds = [
      ...new Set(
        [
          ...requirement.items.map((item) => item.resourceId),
          requirement.resourceId,
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    if (specificIds.length === 0) {
      return { ok: false, reason: 'UNFULFILLABLE' };
    }
    for (const resourceId of specificIds) {
      if (!isActiveResource(params.resourcesById[resourceId])) {
        return { ok: false, reason: 'UNFULFILLABLE' };
      }
      collected.push({ resourceId, quantity });
    }
  }

  return { ok: true, assignments: mergeAssignmentQuantities(collected) };
}

/** Exclusive occupancy when capacity is 1 (Prisma default). null = unlimited. */
export function resourceCapacityExceeded(params: {
  capacity: number | null;
  requestedQuantity: number;
  overlappingUsedQuantity: number;
}): boolean {
  if (params.capacity == null) {
    return false;
  }
  return (
    params.overlappingUsedQuantity + params.requestedQuantity > params.capacity
  );
}
