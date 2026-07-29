import {
  defaultPermissionsForMember,
  canViewAllStaffCalendars,
  hasStaffPermission,
  normalizeStaffPermissions,
} from './staff-permission.registry';

describe('staff-permission.registry', () => {
  it('normalizes unknown keys away', () => {
    const result = normalizeStaffPermissions({
      'appointments.access': true,
      'invalid.key': true,
    });
    expect(result['appointments.access']).toBe(true);
    expect(result['contacts.access']).toBe(false);
  });

  it('migrates legacy contacts.access into Mangomint privacy keys', () => {
    const result = normalizeStaffPermissions({
      'contacts.access': true,
    });
    expect(result['contacts.access']).toBe(true);
    expect(result['contacts.view_last_names']).toBe(true);
    expect(result['contacts.view_contact_details']).toBe(true);
  });

  it('migrates contacts.manage into delete_merge when unset', () => {
    const result = normalizeStaffPermissions({
      'contacts.manage': true,
    });
    expect(result['contacts.delete_merge']).toBe(true);
  });

  it('applies service provider defaults', () => {
    const defaults = defaultPermissionsForMember({ isServiceProvider: true });
    expect(defaults['appointments.access']).toBe(true);
    expect(defaults['appointments.manage_own']).toBe(true);
    expect(defaults['appointments.manage_own_time_blocks']).toBe(true);
    expect(defaults['appointments.change_status']).toBe(true);
    expect(defaults['time_clock.access']).toBe(true);
  });

  it('grants all permissions to admin roles', () => {
    expect(
      hasStaffPermission({}, 'sales.access', 'ADMIN'),
    ).toBe(true);
    expect(
      hasStaffPermission({ 'sales.access': false }, 'sales.access', 'MEMBER'),
    ).toBe(false);
  });

  it('migrates legacy sales.access into Mangomint sales visibility keys', () => {
    const result = normalizeStaffPermissions({
      'sales.access': true,
    });
    expect(result['sales.view_all']).toBe(true);
    expect(result['sales.view_own']).toBe(true);
    expect(result['sales.access']).toBe(true);
  });

  it('derives sales.access from view_own or view_all', () => {
    expect(
      normalizeStaffPermissions({ 'sales.view_own': true })['sales.access'],
    ).toBe(true);
    expect(
      normalizeStaffPermissions({ 'sales.view_all': true })['sales.access'],
    ).toBe(true);
  });

  it('migrates sales.refund into refund_open when unset', () => {
    const result = normalizeStaffPermissions({
      'sales.refund': true,
    });
    expect(result['sales.refund_open']).toBe(true);
  });

  it('lets manage_all imply view_all calendars', () => {
    expect(
      canViewAllStaffCalendars(
        { 'appointments.manage_all': true },
        'MEMBER',
      ),
    ).toBe(false);
    expect(
      canViewAllStaffCalendars(
        { 'appointments.view_all_calendars': true },
        'MEMBER',
      ),
    ).toBe(true);
    expect(canViewAllStaffCalendars({}, 'MEMBER')).toBe(false);
    expect(canViewAllStaffCalendars({}, 'ADMIN')).toBe(true);
  });
});
