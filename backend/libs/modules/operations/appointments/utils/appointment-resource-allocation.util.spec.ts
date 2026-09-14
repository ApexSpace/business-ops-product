import {
  mergeAssignmentQuantities,
  resolveRequiredResources,
  resourceCapacityExceeded,
  type AllocatableResource,
  type ResourceRequirementInput,
} from './appointment-resource-allocation.util';

const roomA: AllocatableResource = {
  id: 'room-a',
  groupId: 'group-rooms',
  status: 'ACTIVE',
  deletedAt: null,
  capacity: 1,
};

const roomB: AllocatableResource = {
  id: 'room-b',
  groupId: 'group-rooms',
  status: 'ACTIVE',
  deletedAt: null,
  capacity: 1,
};

const inactiveRoom: AllocatableResource = {
  id: 'room-dead',
  groupId: 'group-rooms',
  status: 'INACTIVE',
  deletedAt: null,
  capacity: 1,
};

function specificRequirement(
  overrides: Partial<ResourceRequirementInput> = {},
): ResourceRequirementInput {
  return {
    serviceId: 'svc-1',
    selectionMode: 'SPECIFIC',
    groupId: 'group-rooms',
    resourceId: null,
    quantity: 1,
    items: [{ resourceId: 'room-a' }],
    ...overrides,
  };
}

describe('appointment-resource-allocation.util', () => {
  describe('resolveRequiredResources', () => {
    it('returns no assignments when the service has no requirements', () => {
      const result = resolveRequiredResources({
        requirements: [],
        groupMembersByGroupId: {},
        resourcesById: {},
      });

      expect(result).toEqual({ ok: true, assignments: [] });
    });

    it('allocates every active member for ALL + group', () => {
      const result = resolveRequiredResources({
        requirements: [
          {
            serviceId: 'svc-1',
            selectionMode: 'ALL',
            groupId: 'group-rooms',
            resourceId: null,
            quantity: 1,
            items: [],
          },
        ],
        groupMembersByGroupId: {
          'group-rooms': [roomA, roomB, inactiveRoom],
        },
        resourcesById: {},
      });

      expect(result).toEqual({
        ok: true,
        assignments: [
          { resourceId: 'room-a', quantity: 1 },
          { resourceId: 'room-b', quantity: 1 },
        ],
      });
    });

    it('is unfulfillable when ALL targets an empty group', () => {
      const result = resolveRequiredResources({
        requirements: [
          {
            serviceId: 'svc-1',
            selectionMode: 'ALL',
            groupId: 'group-rooms',
            resourceId: null,
            quantity: 1,
            items: [],
          },
        ],
        groupMembersByGroupId: { 'group-rooms': [] },
        resourcesById: {},
      });

      expect(result).toEqual({ ok: false, reason: 'UNFULFILLABLE' });
    });

    it('allocates every SPECIFIC item (AND) plus legacy resourceId', () => {
      const result = resolveRequiredResources({
        requirements: [
          specificRequirement({
            items: [{ resourceId: 'room-a' }, { resourceId: 'room-b' }],
            resourceId: 'room-a',
          }),
        ],
        groupMembersByGroupId: {},
        resourcesById: { 'room-a': roomA, 'room-b': roomB },
      });

      expect(result).toEqual({
        ok: true,
        assignments: [
          { resourceId: 'room-a', quantity: 1 },
          { resourceId: 'room-b', quantity: 1 },
        ],
      });
    });

    it('is unfulfillable when a SPECIFIC resource is inactive', () => {
      const result = resolveRequiredResources({
        requirements: [
          specificRequirement({
            items: [{ resourceId: 'room-dead' }],
          }),
        ],
        groupMembersByGroupId: {},
        resourcesById: { 'room-dead': inactiveRoom },
      });

      expect(result).toEqual({ ok: false, reason: 'UNFULFILLABLE' });
    });
  });

  describe('mergeAssignmentQuantities', () => {
    it('keeps one row per resource using the max quantity', () => {
      expect(
        mergeAssignmentQuantities([
          { resourceId: 'room-a', quantity: 1 },
          { resourceId: 'room-a', quantity: 2 },
          { resourceId: 'room-b', quantity: 1 },
        ]),
      ).toEqual([
        { resourceId: 'room-a', quantity: 2 },
        { resourceId: 'room-b', quantity: 1 },
      ]);
    });
  });

  describe('resourceCapacityExceeded', () => {
    it('treats capacity 1 as exclusive like staff blocking', () => {
      expect(
        resourceCapacityExceeded({
          capacity: 1,
          requestedQuantity: 1,
          overlappingUsedQuantity: 1,
        }),
      ).toBe(true);
      expect(
        resourceCapacityExceeded({
          capacity: 1,
          requestedQuantity: 1,
          overlappingUsedQuantity: 0,
        }),
      ).toBe(false);
    });

    it('allows concurrent use until capacity is exceeded', () => {
      expect(
        resourceCapacityExceeded({
          capacity: 2,
          requestedQuantity: 1,
          overlappingUsedQuantity: 1,
        }),
      ).toBe(false);
      expect(
        resourceCapacityExceeded({
          capacity: 2,
          requestedQuantity: 1,
          overlappingUsedQuantity: 2,
        }),
      ).toBe(true);
    });

    it('skips overlap when capacity is unlimited', () => {
      expect(
        resourceCapacityExceeded({
          capacity: null,
          requestedQuantity: 1,
          overlappingUsedQuantity: 99,
        }),
      ).toBe(false);
    });
  });
});
