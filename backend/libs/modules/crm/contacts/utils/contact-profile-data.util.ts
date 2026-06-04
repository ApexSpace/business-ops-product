import { Prisma } from '@prisma/client';
import { ContactProfileDto } from '../dto/contact-profile.dto';
import {
  buildDisplayName,
  emptyToUndefined,
  sanitizePhoneFields,
} from './contact-profile.util';

export function toContactCreateData(
  dto: ContactProfileDto & { source?: string },
): Omit<Prisma.ContactCreateInput, 'business' | 'createdBy' | 'tags'> {
  const displayName =
    emptyToUndefined(dto.displayName) ??
    buildDisplayName(dto.firstName, dto.lastName);

  const phone = sanitizePhoneFields(dto.phoneCountryCode, dto.phoneNumber);

  return {
    firstName: emptyToUndefined(dto.firstName) ?? null,
    lastName: emptyToUndefined(dto.lastName) ?? null,
    displayName: displayName ?? null,
    companyName: emptyToUndefined(dto.companyName) ?? null,
    email: emptyToUndefined(dto.email) ?? null,
    phoneCountryCode: phone.phoneCountryCode,
    phoneNumber: phone.phoneNumber,
    timezone: emptyToUndefined(dto.timezone) ?? null,
    address: emptyToUndefined(dto.address) ?? null,
    city: emptyToUndefined(dto.city) ?? null,
    state: emptyToUndefined(dto.state) ?? null,
    country: emptyToUndefined(dto.country) ?? null,
    zip: emptyToUndefined(dto.zip) ?? null,
    avatarUrl: emptyToUndefined(dto.avatarUrl) ?? null,
    source: emptyToUndefined(dto.source) ?? null,
  };
}

export function toContactUpdateData(
  dto: ContactProfileDto & { source?: string },
): Prisma.ContactUpdateInput {
  const data: Prisma.ContactUpdateInput = {};

  if (dto.source !== undefined) {
    data.source = emptyToUndefined(dto.source) ?? null;
  }

  const fields = [
    'firstName',
    'lastName',
    'companyName',
    'email',
    'phoneCountryCode',
    'phoneNumber',
    'timezone',
    'address',
    'city',
    'state',
    'country',
    'zip',
    'avatarUrl',
  ] as const;

  for (const field of fields) {
    if (dto[field] !== undefined) {
      (data as Record<string, unknown>)[field] =
        emptyToUndefined(dto[field]) ?? null;
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
        dto.firstName ?? undefined,
        dto.lastName ?? undefined,
      ) ??
      null;
  }

  return data;
}
