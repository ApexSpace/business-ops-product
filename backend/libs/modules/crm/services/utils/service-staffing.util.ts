export type ServiceStaffingMode =
  | 'SINGLE_STAFF'
  | 'TWO_STAFF'
  | 'RESOURCE_ONLY';

export function resolveStaffingMode(service: {
  requiresNoStaff: boolean;
  requiresTwoStaff: boolean;
}): ServiceStaffingMode {
  if (service.requiresNoStaff) {
    return 'RESOURCE_ONLY';
  }
  if (service.requiresTwoStaff) {
    return 'TWO_STAFF';
  }
  return 'SINGLE_STAFF';
}

export function assertStaffingFlagsCompatible(flags: {
  requiresNoStaff: boolean;
  requiresTwoStaff: boolean;
}): void {
  if (flags.requiresNoStaff && flags.requiresTwoStaff) {
    throw new Error(
      'requiresNoStaff and requiresTwoStaff cannot both be enabled',
    );
  }
}
