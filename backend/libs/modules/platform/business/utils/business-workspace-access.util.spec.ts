import { BusinessStatus } from '@prisma/client';
import type { Request } from 'express';
import {
  canSelectBusinessWorkspace,
  isBillingRecoveryAllowedRequest,
  isBillingRecoveryMode,
  isBillingRecoveryReason,
  resolveBusinessStatusForBillingChange,
} from './business-workspace-access.util';

function mockRequest(method: string, url: string): Request {
  return { method, originalUrl: url, url } as Request;
}

describe('business-workspace-access.util', () => {
  it('allows selecting active workspaces only', () => {
    expect(canSelectBusinessWorkspace(BusinessStatus.ACTIVE)).toBe(true);
    expect(canSelectBusinessWorkspace(BusinessStatus.NOT_ACTIVE)).toBe(false);
    expect(canSelectBusinessWorkspace(BusinessStatus.SUSPENDED)).toBe(false);
  });

  it('treats subscription billing blocks as billing recovery', () => {
    expect(isBillingRecoveryReason('SUBSCRIPTION_CANCELED')).toBe(true);
    expect(isBillingRecoveryReason('TRIAL_EXPIRED')).toBe(true);
    expect(isBillingRecoveryReason('BUSINESS_NOT_ACTIVE')).toBe(false);
    expect(isBillingRecoveryReason('BUSINESS_SUSPENDED')).toBe(false);
  });

  it('detects billing recovery mode for active workspace with blocked subscription', () => {
    expect(
      isBillingRecoveryMode(
        BusinessStatus.ACTIVE,
        false,
        'SUBSCRIPTION_CANCELED',
      ),
    ).toBe(true);
    expect(
      isBillingRecoveryMode(
        BusinessStatus.SUSPENDED,
        false,
        'SUBSCRIPTION_CANCELED',
      ),
    ).toBe(false);
    expect(
      isBillingRecoveryMode(
        BusinessStatus.ACTIVE,
        true,
        'SUBSCRIPTION_ACTIVE',
      ),
    ).toBe(false);
  });

  it('preserves suspended status during billing updates', () => {
    expect(
      resolveBusinessStatusForBillingChange(BusinessStatus.SUSPENDED),
    ).toBe(BusinessStatus.SUSPENDED);
    expect(
      resolveBusinessStatusForBillingChange(BusinessStatus.NOT_ACTIVE),
    ).toBe(BusinessStatus.ACTIVE);
  });

  it('allows session bootstrap endpoints during billing recovery', () => {
    expect(
      isBillingRecoveryAllowedRequest(
        mockRequest('GET', '/api/v1/auth/me'),
      ),
    ).toBe(true);
    expect(
      isBillingRecoveryAllowedRequest(
        mockRequest('GET', '/api/v1/businesses/current/access'),
      ),
    ).toBe(true);
    expect(
      isBillingRecoveryAllowedRequest(
        mockRequest('GET', '/api/v1/contacts'),
      ),
    ).toBe(false);
  });
});
