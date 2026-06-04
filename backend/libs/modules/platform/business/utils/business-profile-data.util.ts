import { BusinessStatus, Prisma } from '@prisma/client';
import { BusinessProfileDto } from '../dto/business-profile.dto';
import { sanitizePhoneFields } from '@app/modules/crm/contacts/utils/contact-profile.util';
import { buildDisplayName, emptyToUndefined } from './business-profile.util';

type ProfileInput = BusinessProfileDto & {
  name?: string;
  industryId?: string | null;
};

export function toBusinessCreateData(
  dto: ProfileInput & { name: string; industryId: string },
): Omit<Prisma.BusinessCreateInput, 'slug' | 'createdBy'> {
  const displayName =
    emptyToUndefined(dto.displayName) ??
    buildDisplayName(dto.firstName, dto.lastName);

  const phone = sanitizePhoneFields(dto.phoneCountryCode, dto.phoneNumber);

  return {
    name: dto.name,
    industry: { connect: { id: dto.industryId } },
    status: dto.status ?? BusinessStatus.ACTIVE,
    firstName: emptyToUndefined(dto.firstName),
    lastName: emptyToUndefined(dto.lastName),
    displayName,
    email: emptyToUndefined(dto.email),
    phoneCountryCode: phone.phoneCountryCode,
    phoneNumber: phone.phoneNumber,
    address: emptyToUndefined(dto.address),
    city: emptyToUndefined(dto.city),
    state: emptyToUndefined(dto.state),
    country: emptyToUndefined(dto.country),
    zip: emptyToUndefined(dto.zip),
    website: emptyToUndefined(dto.website),
    timezone: emptyToUndefined(dto.timezone),
  };
}

export function toBusinessUpdateData(
  dto: ProfileInput,
): Prisma.BusinessUpdateInput {
  const data: Prisma.BusinessUpdateInput = {};

  if (dto.name !== undefined) data.name = dto.name;
  if (dto.status !== undefined) data.status = dto.status;

  if (dto.industryId !== undefined) {
    data.industry = dto.industryId
      ? { connect: { id: dto.industryId } }
      : { disconnect: true };
  }

  const profileFields = [
    'firstName',
    'lastName',
    'email',
    'phoneCountryCode',
    'phoneNumber',
    'address',
    'city',
    'state',
    'country',
    'zip',
    'website',
    'timezone',
  ] as const;

  for (const field of profileFields) {
    if (dto[field] !== undefined) {
      (data as Record<string, unknown>)[field] = emptyToUndefined(dto[field]);
    }
  }

  if (dto.phoneCountryCode !== undefined || dto.phoneNumber !== undefined) {
    const phone = sanitizePhoneFields(
      dto.phoneCountryCode ?? null,
      dto.phoneNumber ?? null,
    );
    data.phoneCountryCode = phone.phoneCountryCode;
    data.phoneNumber = phone.phoneNumber;
  }

  if (
    dto.displayName !== undefined ||
    dto.firstName !== undefined ||
    dto.lastName !== undefined
  ) {
    data.displayName =
      emptyToUndefined(dto.displayName) ??
      buildDisplayName(
        dto.firstName ?? (data.firstName as string | undefined),
        dto.lastName ?? (data.lastName as string | undefined),
      ) ??
      null;
  }

  return data;
}
