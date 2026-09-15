import {
  BusinessCapabilityAssignmentStatus,
  BusinessFeatureGrantStatus,
} from '@prisma/client';
import { BusinessEffectiveCapabilitiesService } from './business-effective-capabilities.service';
import { BusinessCapabilityRepository } from '../repositories/business-capability.repository';

describe('BusinessEffectiveCapabilitiesService', () => {
  const businessId = 'biz-list-only';

  const prisma = {
    capability: { findMany: jest.fn() },
    businessFeatureGrant: { findMany: jest.fn() },
  };

  const businessCapabilityRepository = {
    findByBusinessId: jest.fn(),
  };

  const service = new BusinessEffectiveCapabilitiesService(
    prisma as never,
    businessCapabilityRepository as unknown as BusinessCapabilityRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.businessFeatureGrant.findMany.mockResolvedValue([]);
  });

  it('CAP-02: does not expand module options when the bundle lists explicit features', async () => {
    businessCapabilityRepository.findByBusinessId.mockResolvedValue([
      {
        status: BusinessCapabilityAssignmentStatus.ACTIVE,
        capabilityId: 'cap-list',
        capability: { key: 'qa_appt_list_only' },
      },
    ]);
    prisma.capability.findMany.mockResolvedValue([
      {
        id: 'cap-list',
        key: 'qa_appt_list_only',
        featureAssignments: [
          { featureKey: 'appointments.list' },
          { featureKey: 'contacts.list' },
        ],
        moduleAssignments: [{ moduleKey: 'appointments' }],
      },
    ]);

    const keys = await service.resolveFeatureKeys(businessId);

    expect(keys.has('appointments.list')).toBe(true);
    expect(keys.has('contacts.list')).toBe(true);
    expect(keys.has('appointments.express_booking')).toBe(false);
  });

  it('still expands all module options when the bundle has only module assignments', async () => {
    businessCapabilityRepository.findByBusinessId.mockResolvedValue([
      {
        status: BusinessCapabilityAssignmentStatus.ACTIVE,
        capabilityId: 'cap-module',
        capability: { key: 'qa_appointments_module' },
      },
    ]);
    prisma.capability.findMany.mockResolvedValue([
      {
        id: 'cap-module',
        key: 'qa_appointments_module',
        featureAssignments: [],
        moduleAssignments: [{ moduleKey: 'appointments' }],
      },
    ]);

    const keys = await service.resolveFeatureKeys(businessId);

    expect(keys.has('appointments.list')).toBe(true);
    expect(keys.has('appointments.express_booking')).toBe(true);
  });

  it('includes grandfathered feature grants', async () => {
    businessCapabilityRepository.findByBusinessId.mockResolvedValue([]);
    prisma.businessFeatureGrant.findMany.mockResolvedValue([
      {
        featureKey: 'appointments.list',
        status: BusinessFeatureGrantStatus.ACTIVE,
      },
    ]);

    const keys = await service.resolveFeatureKeys(businessId);

    expect(keys.has('appointments.list')).toBe(true);
    expect(keys.has('appointments.express_booking')).toBe(false);
  });
});
