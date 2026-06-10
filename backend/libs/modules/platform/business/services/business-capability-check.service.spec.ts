import { BusinessCapabilityCheckService } from './business-capability-check.service';
import { BusinessEffectiveCapabilitiesService } from './business-effective-capabilities.service';

describe('BusinessCapabilityCheckService', () => {
  const businessId = 'biz-1';

  function createService(
    keys: string[],
  ): BusinessCapabilityCheckService {
    const effectiveCapabilitiesService = {
      resolveFeatureKeys: jest.fn().mockResolvedValue(new Set(keys)),
    } as unknown as BusinessEffectiveCapabilitiesService;

    return new BusinessCapabilityCheckService(effectiveCapabilitiesService);
  }

  it('returns true when business has a module feature key', async () => {
    const service = createService(['payments.estimates.list']);
    await expect(service.hasModule(businessId, 'payments')).resolves.toBe(true);
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
        .mockResolvedValue(new Set(['payments.estimates.list'])),
    } as unknown as BusinessEffectiveCapabilitiesService;
    const service = new BusinessCapabilityCheckService(
      effectiveCapabilitiesService,
    );

    await service.hasModule(businessId, 'payments');
    await service.hasModule(businessId, 'payments');

    expect(effectiveCapabilitiesService.resolveFeatureKeys).toHaveBeenCalledTimes(
      1,
    );
  });
});
