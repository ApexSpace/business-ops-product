import { HttpStatus } from '@nestjs/common';
import { BusinessMemberRole } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { hasStaffPermission } from '@app/modules/platform/membership/permissions/staff-permission.registry';
import type { ContactResponseDto } from '../dto/contact-response.dto';
import { resolveContactLabel } from '../mappers/contact.mapper';

function isAdmin(role?: string | null): boolean {
  return (
    role === BusinessMemberRole.OWNER || role === BusinessMemberRole.ADMIN
  );
}

function isPlatformOps(user?: RequestUser): boolean {
  return user?.context === 'platform' && !!user.platformRole;
}

export function canViewContactLastNames(
  user?: RequestUser,
): boolean {
  if (!user) return false;
  if (isPlatformOps(user) || isAdmin(user.businessRole)) return true;
  return hasStaffPermission(
    user.staffPermissions,
    'contacts.view_last_names',
    user.businessRole,
  );
}

export function canViewContactDetails(user?: RequestUser): boolean {
  if (!user) return false;
  if (isPlatformOps(user) || isAdmin(user.businessRole)) return true;
  return hasStaffPermission(
    user.staffPermissions,
    'contacts.view_contact_details',
    user.businessRole,
  );
}

export function assertCanListContacts(user?: RequestUser): void {
  if (canViewContactLastNames(user)) return;
  throw new AppException(
    ErrorCode.FORBIDDEN,
    'You do not have permission to access the clients list',
    HttpStatus.FORBIDDEN,
  );
}

export function applyContactPrivacy(
  contact: ContactResponseDto,
  user?: RequestUser,
): ContactResponseDto {
  if (!user || isPlatformOps(user) || isAdmin(user.businessRole)) {
    return contact;
  }

  const next = { ...contact };
  const canLastNames = canViewContactLastNames(user);
  const canDetails = canViewContactDetails(user);

  if (!canLastNames) {
    next.lastName = null;
    if (next.displayName?.trim()) {
      const first = next.firstName?.trim();
      if (first && next.displayName.trim().endsWith(contact.lastName?.trim() ?? '')) {
        next.displayName = first;
      } else if (first) {
        // Prefer first name over a display name that may include last name.
        next.displayName = first;
      }
    }
  }

  if (!canDetails) {
    next.email = null;
    next.phoneCountryCode = null;
    next.phoneNumber = null;
    next.phone = null;
  }

  next.label = resolveContactLabel({
    displayName: next.displayName,
    firstName: next.firstName,
    lastName: next.lastName,
    companyName: next.companyName,
    email: next.email,
    phoneCountryCode: next.phoneCountryCode,
    phoneNumber: next.phoneNumber,
  });

  return next;
}

/** Redact nested contact summaries (appointments, etc.). */
export function applyContactSummaryPrivacy<
  T extends {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    phone?: string | null;
  },
>(summary: T, user?: RequestUser): T {
  if (!user || isPlatformOps(user) || isAdmin(user.businessRole)) return summary;
  const next = { ...summary };
  if (!canViewContactLastNames(user)) {
    next.lastName = null;
    if (next.displayName && next.firstName) {
      next.displayName = next.firstName;
    }
  }
  if (!canViewContactDetails(user)) {
    if ('email' in next) next.email = null;
    if ('phoneNumber' in next) next.phoneNumber = null;
    if ('phone' in next) next.phone = null;
  }
  return next;
}
