import { InvoiceStatus } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import {
  assertCanRefundSale,
  canViewCheckout,
  canViewAllSales,
  isOwnCheckout,
} from './sales-staff-access.util';

function member(
  permissions: Record<string, boolean> = {},
): RequestUser {
  return {
    id: 'user-1',
    businessId: 'biz-1',
    context: 'business',
    businessRole: 'MEMBER',
    staffPermissions: permissions,
  } as RequestUser;
}

describe('sales-staff-access.util', () => {
  it('treats createdBy or staffed lines as own sales', () => {
    expect(
      isOwnCheckout({ createdById: 'user-1', items: [] }, 'user-1'),
    ).toBe(true);
    expect(
      isOwnCheckout(
        { createdById: 'other', items: [{ staffUserId: 'user-1' }] },
        'user-1',
      ),
    ).toBe(true);
    expect(
      isOwnCheckout(
        { createdById: 'other', items: [{ staffUserId: 'other' }] },
        'user-1',
      ),
    ).toBe(false);
  });

  it('allows calendar-attached sales with view_on_calendar', () => {
    const user = member({ 'sales.view_on_calendar': true });
    expect(canViewAllSales(user)).toBe(false);
    expect(
      canViewCheckout(user, {
        createdById: 'other',
        appointmentId: 'appt-1',
        items: [],
      }),
    ).toBe(true);
    expect(
      canViewCheckout(user, {
        createdById: 'other',
        appointmentId: null,
        items: [],
      }),
    ).toBe(false);
  });

  it('allows appointment checkouts when user can start checkout', () => {
    const user = member({ 'sales.checkout': true });
    expect(
      canViewCheckout(user, {
        createdById: 'other',
        appointmentId: 'appt-1',
        items: [],
      }),
    ).toBe(true);
  });

  it('allows open refunds with refund_open but not closed', () => {
    const user = member({ 'sales.refund_open': true });
    expect(() =>
      assertCanRefundSale(user, InvoiceStatus.OPEN),
    ).not.toThrow();
    expect(() =>
      assertCanRefundSale(user, InvoiceStatus.PAID),
    ).toThrow(/closed sales/);
  });

  it('allows full refunds with sales.refund', () => {
    const user = member({ 'sales.refund': true });
    expect(() =>
      assertCanRefundSale(user, InvoiceStatus.PAID),
    ).not.toThrow();
  });
});
