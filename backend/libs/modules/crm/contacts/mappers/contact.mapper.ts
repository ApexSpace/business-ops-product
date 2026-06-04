import { ContactResponseDto } from '../dto/contact-response.dto';
import { ContactWithTags } from '../repositories/contact.repository';
import { formatPhone } from '../utils/contact-profile.util';

export function resolveContactLabel(contact: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
}): string {
  if (contact.displayName?.trim()) {
    return contact.displayName.trim();
  }
  const fullName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName) {
    return fullName;
  }
  if (contact.companyName?.trim()) {
    return contact.companyName.trim();
  }
  if (contact.email?.trim()) {
    return contact.email.trim();
  }
  const phone = formatPhone(contact.phoneCountryCode, contact.phoneNumber);
  if (phone) {
    return phone;
  }
  return 'Unnamed';
}

export function toContactResponse(contact: ContactWithTags): ContactResponseDto {
  return {
    id: contact.id,
    businessId: contact.businessId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    displayName: contact.displayName,
    companyName: contact.companyName,
    email: contact.email,
    phoneCountryCode: contact.phoneCountryCode,
    phoneNumber: contact.phoneNumber,
    phone: formatPhone(contact.phoneCountryCode, contact.phoneNumber),
    timezone: contact.timezone,
    address: contact.address,
    city: contact.city,
    state: contact.state,
    country: contact.country,
    zip: contact.zip,
    avatarUrl: contact.avatarUrl,
    source: contact.source,
    createdById: contact.createdById,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    label: resolveContactLabel(contact),
    tags: contact.tags.map((ct: { tag: { id: string; name: string } }) => ({
      id: ct.tag.id,
      name: ct.tag.name,
    })),
  };
}
