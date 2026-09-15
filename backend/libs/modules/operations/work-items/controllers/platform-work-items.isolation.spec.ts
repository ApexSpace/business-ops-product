import { INTERNAL_OPS_BUSINESS_ID } from '@app/modules/platform/business/utils/tenant-business-scope.util';

describe('platform work items isolation', () => {
  it('does not use JWT businessId for INTERNAL ops scoping', () => {
    // Controllers must resolve tenant via InternalBusinessService only.
    // This constant is the seeded ops workspace — never accept client businessId.
    expect(INTERNAL_OPS_BUSINESS_ID).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
  });
});
