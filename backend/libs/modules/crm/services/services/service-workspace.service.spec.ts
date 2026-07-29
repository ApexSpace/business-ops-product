import { ServiceWorkspaceService } from './service-workspace.service';

describe('ServiceWorkspaceService', () => {
  const serviceRepository = {
    findByIdWithCategory: jest.fn(),
    update: jest.fn(),
  };
  const categoryRepository = { findById: jest.fn() };
  const workspaceRepository = {
    findWorkspace: jest.fn(),
    countEnabledStaff: jest.fn(),
    countResourceRequirements: jest.fn(),
    findOnlineBookingSettings: jest.fn(),
    replaceStaff: jest.fn(),
  };
  const membershipRepository = {
    findActiveByUserAndBusiness: jest.fn(),
  };
  const auditService = { log: jest.fn() };
  const resourcesService = {
    assertResourceExists: jest.fn(),
  };

  const service = new ServiceWorkspaceService(
    serviceRepository as never,
    categoryRepository as never,
    workspaceRepository as never,
    membershipRepository as never,
    auditService as never,
    resourcesService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:3001';
  });

  it('builds direct links when calendar slug exists', async () => {
    serviceRepository.findByIdWithCategory.mockResolvedValue({
      id: 'svc-1',
      businessId: 'biz',
    });
    workspaceRepository.findOnlineBookingSettings.mockResolvedValue({
      calendar: { publicSlug: 'acme-dental' },
    });
    workspaceRepository.findWorkspace.mockResolvedValue({
      staffAssignments: [
        {
          userId: 'user-1',
          isEnabled: true,
          onlineBookingEnabled: true,
        },
      ],
    });

    const result = await service.getDirectLinks('biz', 'svc-1');

    expect(result.serviceLink).toContain('serviceId=svc-1');
    expect(result.staffLinks).toHaveLength(1);
  });

  it('validates option group min/max', async () => {
    serviceRepository.findByIdWithCategory.mockResolvedValue({
      id: 'svc-1',
      businessId: 'biz',
    });
    workspaceRepository.findWorkspace.mockResolvedValue({ optionGroups: [] });

    await expect(
      service.createOptionGroup(
        'biz',
        'svc-1',
        { name: 'Addons', minSelections: 3, maxSelections: 1 },
        { id: 'user-1' } as never,
      ),
    ).rejects.toThrow();
  });
});
