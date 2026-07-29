import { BusinessCapabilityCheckService } from './business-capability-check.service';
import { BusinessEffectiveCapabilitiesService } from './business-effective-capabilities.service';

describe('BusinessCapabilityCheckService', () => {
  const businessId = 'biz-1';

  function createService(keys: string[]): BusinessCapabilityCheckService {
    const effectiveCapabilitiesService = {
      resolveFeatureKeys: jest.fn().mockResolvedValue(new Set(keys)),
    } as unknown as BusinessEffectiveCapabilitiesService;

    return new BusinessCapabilityCheckService(effectiveCapabilitiesService);
  }

  it('returns true when business has a module feature key', async () => {
    const service = createService(['estimates.list']);
    await expect(service.hasModule(businessId, 'estimates')).resolves.toBe(
      true,
    );
  });

  it('returns false when module features are missing', async () => {
    const service = createService(['contacts.list']);
    await expect(service.hasModule(businessId, 'payments')).resolves.toBe(
      false,
    );
  });

  it('caches capability keys per request', async () => {
    const effectiveCapabilitiesService = {
      resolveFeatureKeys: jest
        .fn()
        .mockResolvedValue(new Set(['estimates.list'])),
    } as unknown as BusinessEffectiveCapabilitiesService;
    const service = new BusinessCapabilityCheckService(
      effectiveCapabilitiesService,
    );

    await service.hasModule(businessId, 'estimates');
    await service.hasModule(businessId, 'estimates');

    expect(
      effectiveCapabilitiesService.resolveFeatureKeys,
    ).toHaveBeenCalledTimes(1);
  });

  it('accepts legacy capability keys via normalize', async () => {
    const service = createService(['forms.list']);
    await expect(
      service.hasCapability(businessId, 'settings.forms.list'),
    ).resolves.toBe(true);
  });
});