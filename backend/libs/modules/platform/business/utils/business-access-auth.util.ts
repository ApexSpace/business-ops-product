import { BusinessStatus } from '@prisma/client';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessAccessReasonCode } from '../types/business-access-resolution.types';

export function mapAccessBlockToAuthError(
  businessStatus: BusinessStatus,
  reasonCode: BusinessAccessReasonCode,
): { code: ErrorCode; message: string } {
  if (businessStatus === BusinessStatus.SUSPENDED) {
    return {
      code: ErrorCode.BUSINESS_SUSPENDED,
      message: 'Your workspace has been suspended.',
    };
  }

  if (businessStatus === BusinessStatus.NOT_ACTIVE) {
    return {
      code: ErrorCode.BUSINESS_NOT_ACTIVE,
      message: 'Your workspace is not active yet.',
    };
  }

  switch (reasonCode) {
    case 'SUBSCRIPTION_PENDING_PAYMENT':
      return {
        code: ErrorCode.BUSINESS_PENDING_PAYMENT,
        message: 'Your workspace is pending payment.',
      };
    case 'TRIAL_EXPIRED':
      return {
        code: ErrorCode.BUSINESS_TRIAL_EXPIRED,
        message: 'Your trial has expired.',
      };
    case 'SUBSCRIPTION_EXPIRED':
      return {
        code: ErrorCode.BUSINESS_ACCESS_EXPIRED,
        message: 'Your access period has expired.',
      };
    case 'SUBSCRIPTION_CANCELED':
      return {
        code: ErrorCode.BUSINESS_SUBSCRIPTION_CANCELED,
        message: 'Your workspace subscription has been canceled.',
      };
    case 'NO_SUBSCRIPTION':
      return {
        code: ErrorCode.NO_SUBSCRIPTION,
        message:
          'This workspace does not have an active subscription yet.',
      };
    case 'BUSINESS_SUSPENDED':
      return {
        code: ErrorCode.BUSINESS_SUSPENDED,
        message: 'Your workspace has been suspended.',
      };
    case 'BUSINESS_NOT_ACTIVE':
      return {
        code: ErrorCode.BUSINESS_NOT_ACTIVE,
        message: 'Your workspace is not active yet.',
      };
    default:
      return {
        code: ErrorCode.BUSINESS_NOT_ACTIVE,
        message: 'Your workspace is not active yet.',
      };
  }
}
