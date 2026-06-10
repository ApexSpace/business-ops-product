import { BusinessStatus } from '@prisma/client';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { mapAccessBlockToAuthError } from './business-access-auth.util';

describe('mapAccessBlockToAuthError', () => {
  it('maps trial expired separately from subscription expired', () => {
    expect(
      mapAccessBlockToAuthError(BusinessStatus.ACTIVE, 'TRIAL_EXPIRED'),
    ).toEqual({
      code: ErrorCode.BUSINESS_TRIAL_EXPIRED,
      message: 'Your trial has expired.',
    });

    expect(
      mapAccessBlockToAuthError(BusinessStatus.ACTIVE, 'SUBSCRIPTION_EXPIRED'),
    ).toEqual({
      code: ErrorCode.BUSINESS_ACCESS_EXPIRED,
      message: 'Your access period has expired.',
    });
  });

  it('maps no subscription to NO_SUBSCRIPTION', () => {
    expect(
      mapAccessBlockToAuthError(BusinessStatus.ACTIVE, 'NO_SUBSCRIPTION'),
    ).toEqual({
      code: ErrorCode.NO_SUBSCRIPTION,
      message:
        'This workspace does not have an active subscription yet.',
    });
  });
});
