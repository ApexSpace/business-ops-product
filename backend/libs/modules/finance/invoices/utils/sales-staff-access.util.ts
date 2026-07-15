import { HttpStatus } from '@nestjs/common';
import { BusinessMemberRole, InvoiceStatus } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { hasStaffPermission } from '@app/modules/platform/membership/permissions/staff-permission.registry';

export type CheckoutVisibilityShape = {
  createdById?: string | null;
  appointmentId?: string | null;
  status?: InvoiceStatus | string | null;
  items?: Array<{ staffUserId?: string | null }> | null;
};

function isAdmin(role?: string | null): boolean {
  return (
    role === BusinessMemberRole.OWNER || role === BusinessMemberRole.ADMIN
  );
}

export function canViewAllSales(user?: RequestUser): boolean {
  if (!user) return false;
  if (isAdmin(user.businessRole)) return true;
  return hasStaffPermission(
    user.staffPermissions,
    'sales.view_all',
    user.businessRole,
  );
}

export function canViewOwnSalesList(user?: RequestUser): boolean {
  if (!user) return false;
  if (isAdmin(user.businessRole)) return true;
  return hasStaffPermission(
    user.staffPermissions,
    'sales.view_own',
    user.businessRole,
  );
}

export function canViewSalesOnCalendar(user?: RequestUser): boolean {
  if (!user) return false;
  if (isAdmin(user.businessRole)) return true;
  return hasStaffPermission(
    user.staffPermissions,
    'sales.view_on_calendar',
    user.businessRole,
  );
}

export function isOwnCheckout(
  checkout: CheckoutVisibilityShape,
  userId: string,
): boolean {
  if (checkout.createdById === userId) return true;
  return (checkout.items ?? []).some((item) => item.staffUserId === userId);
}

export function canCheckoutSales(user?: RequestUser): boolean {
  if (!user) return false;
  if (isAdmin(user.businessRole)) return true;
  return hasStaffPermission(
    user.staffPermissions,
    'sales.checkout',
    user.businessRole,
  );
}

export function canViewCheckout(
  user: RequestUser | undefined,
  checkout: CheckoutVisibilityShape,
): boolean {
  if (!user) return false;
  if (canViewAllSales(user)) return true;
  if (isOwnCheckout(checkout, user.id) && canViewOwnSalesList(user)) {
    return true;
  }
  // Staff who can modify sales can open a checkout they are working.
  if (canCheckoutSales(user) && isOwnCheckout(checkout, user.id)) {
    return true;
  }
  // Attached appointment sales only (calendar context).
  if (
    checkout.appointmentId &&
    (canViewSalesOnCalendar(user) || canCheckoutSales(user))
  ) {
    return true;
  }
  return false;
}

export function assertCanViewCheckout(
  user: RequestUser | undefined,
  checkout: CheckoutVisibilityShape,
): void {
  if (canViewCheckout(user, checkout)) return;
  throw new AppException(
    ErrorCode.FORBIDDEN,
    'You do not have permission to view this sale',
    HttpStatus.FORBIDDEN,
  );
}

export function assertCanListSales(user?: RequestUser): void {
  if (canViewAllSales(user) || canViewOwnSalesList(user)) return;
  throw new AppException(
    ErrorCode.FORBIDDEN,
    'You do not have permission to access the sales list',
    HttpStatus.FORBIDDEN,
  );
}

export function assertCanSellNonRetail(user?: RequestUser): void {
  if (!user) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to sell non-retail products',
      HttpStatus.FORBIDDEN,
    );
  }
  if (isAdmin(user.businessRole)) return;
  if (
    hasStaffPermission(
      user.staffPermissions,
      'sales.sell_non_retail',
      user.businessRole,
    )
  ) {
    return;
  }
  throw new AppException(
    ErrorCode.FORBIDDEN,
    'You do not have permission to sell non-retail products',
    HttpStatus.FORBIDDEN,
  );
}

/** Full refund (closed/paid) or open-only refund permission. */
export function assertCanRefundSale(
  user: RequestUser | undefined,
  checkoutStatus: InvoiceStatus | string | null | undefined,
): void {
  if (!user) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to refund this sale',
      HttpStatus.FORBIDDEN,
    );
  }
  if (isAdmin(user.businessRole)) return;

  const canFull = hasStaffPermission(
    user.staffPermissions,
    'sales.refund',
    user.businessRole,
  );
  if (canFull) return;

  const isOpen = checkoutStatus === InvoiceStatus.OPEN;
  const canOpen = hasStaffPermission(
    user.staffPermissions,
    'sales.refund_open',
    user.businessRole,
  );
  if (isOpen && canOpen) return;

  throw new AppException(
    ErrorCode.FORBIDDEN,
    isOpen
      ? 'You do not have permission to refund open sales'
      : 'You do not have permission to refund closed sales',
    HttpStatus.FORBIDDEN,
  );
}
