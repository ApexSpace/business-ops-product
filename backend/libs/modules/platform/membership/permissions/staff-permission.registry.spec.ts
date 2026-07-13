import {
  defaultPermissionsForMember,
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

  it('applies service provider defaults', () => {
    const defaults = defaultPermissionsForMember({ isServiceProvider: true });
    expect(defaults['appointments.access']).toBe(true);
    expect(defaults['appointments.manage_own']).toBe(true);
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
});
