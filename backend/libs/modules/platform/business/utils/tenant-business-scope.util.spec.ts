import {
  BusinessLifecycleStage,
  BusinessType,
} from '@prisma/client';
import {
  customerBusinessRelationWhere,
  customerBusinessWhere,
  funnelBusinessWhere,
  trialBusinessWhere,
  tenantBusinessWhere,
} from './tenant-business-scope.util';

describe('tenant-business-scope helpers', () => {
  it('customerBusinessWhere requires TENANT + ACTIVE', () => {
    expect(customerBusinessWhere({ deletedAt: null })).toEqual({
      type: BusinessType.TENANT,
      lifecycleStage: BusinessLifecycleStage.ACTIVE,
      deletedAt: null,
    });
  });

  it('trialBusinessWhere is opt-in TRIAL only', () => {
    expect(trialBusinessWhere()).toEqual({
      type: BusinessType.TENANT,
      lifecycleStage: BusinessLifecycleStage.TRIAL,
    });
  });

  it('funnelBusinessWhere accepts stage list', () => {
    expect(
      funnelBusinessWhere([
        BusinessLifecycleStage.LEAD,
        BusinessLifecycleStage.TRIAL,
      ]),
    ).toEqual({
      type: BusinessType.TENANT,
      lifecycleStage: {
        in: [BusinessLifecycleStage.LEAD, BusinessLifecycleStage.TRIAL],
      },
    });
  });

  it('tenantBusinessWhere does not imply ACTIVE (legacy all-tenant)', () => {
    expect(tenantBusinessWhere()).toEqual({ type: BusinessType.TENANT });
  });

  it('customerBusinessRelationWhere matches ACTIVE customers', () => {
    expect(customerBusinessRelationWhere()).toEqual({
      type: BusinessType.TENANT,
      lifecycleStage: BusinessLifecycleStage.ACTIVE,
    });
  });
});
