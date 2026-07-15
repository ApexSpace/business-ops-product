import { BusinessMemberRole } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import {
  applyContactPrivacy,
  assertCanListContacts,
  canViewContactDetails,
  canViewContactLastNames,
} from './contact-privacy.util';
import type { ContactResponseDto } from '../dto/contact-response.dto';

function member(
  permissions: Record<string, boolean> = {},
): RequestUser {
  return {
    id: 'user-1',
    businessId: 'biz-1',
    context: 'business',
    businessRole: BusinessMemberRole.MEMBER,
    staffPermissions: permissions,
  } as RequestUser;
}

const fullContact = {
  id: 'c1',
  firstName: 'Jane',
  lastName: 'Doe',
  displayName: 'Jane Doe',
  companyName: null,
  email: 'jane@example.com',
  phoneCountryCode: '+1',
  phoneNumber: '5551234',
  phone: '+1 5551234',
  label: 'Jane Doe',
} as ContactResponseDto;

describe('contact-privacy.util', () => {
  it('allows listing when view_last_names is granted', () => {
    expect(() =>
      assertCanListContacts(
        member({ 'contacts.view_last_names': true }),
      ),
    ).not.toThrow();
  });

  it('blocks listing without view_last_names', () => {
    expect(() =>
      assertCanListContacts(member({ 'contacts.access': true })),
    ).toThrow(/clients list/);
  });

  it('admins always pass privacy checks', () => {
    const admin = {
      ...member(),
      businessRole: BusinessMemberRole.ADMIN,
      staffPermissions: {},
    } as RequestUser;
    expect(canViewContactLastNames(admin)).toBe(true);
    expect(canViewContactDetails(admin)).toBe(true);
    expect(applyContactPrivacy(fullContact, admin)).toEqual(fullContact);
  });

  it('redacts last names when permission is off', () => {
    const result = applyContactPrivacy(
      fullContact,
      member({ 'contacts.view_contact_details': true }),
    );
    expect(result.lastName).toBeNull();
    expect(result.email).toBe('jane@example.com');
    expect(result.label).not.toContain('Doe');
  });

  it('redacts contact details when permission is off', () => {
    const result = applyContactPrivacy(
      fullContact,
      member({ 'contacts.view_last_names': true }),
    );
    expect(result.lastName).toBe('Doe');
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.phoneNumber).toBeNull();
  });
});
