import { Contact, Prisma } from '@prisma/client';
import { normalizePhoneKey } from '@app/modules/crm/contacts/utils/contact-profile.util';
import { normalizeContactEmail } from './contact-channel-identity.util';

const CHANNEL_METADATA_KEYS = [
  'facebookPsid',
  'instagramUserId',
  'whatsappWaId',
  'emailAddress',
] as const;

export function contactCompletenessScore(contact: Contact): number {
  let score = 0;
  if (contact.email?.trim()) score += 3;
  if (contact.phoneNumber?.replace(/\D/g, '')) score += 2;
  if (contact.displayName?.trim()) score += 1;
  if (contact.firstName?.trim()) score += 1;
  if (contact.avatarUrl?.trim()) score += 1;

  const metadata = asMetadataRecord(contact.metadata);
  for (const key of CHANNEL_METADATA_KEYS) {
    if (typeof metadata[key] === 'string' && metadata[key]) {
      score += 2;
    }
  }

  return score;
}

export function pickCanonicalContact(contacts: Contact[]): Contact {
  return [...contacts].sort((a, b) => {
    const scoreDiff = contactCompletenessScore(b) - contactCompletenessScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0]!;
}

export function groupContactsByEmail(contacts: Contact[]): Map<string, Contact[]> {
  const groups = new Map<string, Contact[]>();

  for (const contact of contacts) {
    const email = normalizeContactEmail(contact.email);
    if (!email) continue;

    const bucket = groups.get(email) ?? [];
    bucket.push(contact);
    groups.set(email, bucket);
  }

  return groups;
}

export function groupContactsByPhone(contacts: Contact[]): Map<string, Contact[]> {
  const groups = new Map<string, Contact[]>();

  for (const contact of contacts) {
    const phoneKey = normalizePhoneKey(
      contact.phoneCountryCode,
      contact.phoneNumber,
    );
    if (!phoneKey) continue;

    const bucket = groups.get(phoneKey) ?? [];
    bucket.push(contact);
    groups.set(phoneKey, bucket);
  }

  return groups;
}

export function mergeContactMetadata(
  canonical: Contact,
  duplicates: Contact[],
): Prisma.InputJsonValue {
  const merged = asMetadataRecord(canonical.metadata);

  for (const duplicate of duplicates) {
    const metadata = asMetadataRecord(duplicate.metadata);
    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined || value === '') continue;
      if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
        merged[key] = value;
      }
    }

    for (const key of CHANNEL_METADATA_KEYS) {
      const value = metadata[key];
      if (typeof value === 'string' && value.trim()) {
        merged[key] = value.trim();
      }
    }
  }

  merged.mergedAt = new Date().toISOString();
  return merged as Prisma.InputJsonValue;
}

export function buildCanonicalContactUpdate(
  canonical: Contact,
  duplicates: Contact[],
): Prisma.ContactUpdateInput {
  const metadata = mergeContactMetadata(canonical, duplicates);
  const update: Prisma.ContactUpdateInput = { metadata };

  for (const duplicate of duplicates) {
    if (!canonical.email && duplicate.email) {
      update.email = normalizeContactEmail(duplicate.email);
    }
    if (!canonical.phoneNumber && duplicate.phoneNumber) {
      update.phoneCountryCode = duplicate.phoneCountryCode;
      update.phoneNumber = duplicate.phoneNumber;
    }
    if (!canonical.displayName && duplicate.displayName) {
      update.displayName = duplicate.displayName;
    }
    if (!canonical.firstName && duplicate.firstName) {
      update.firstName = duplicate.firstName;
    }
    if (!canonical.lastName && duplicate.lastName) {
      update.lastName = duplicate.lastName;
    }
    if (!canonical.avatarUrl && duplicate.avatarUrl) {
      update.avatarUrl = duplicate.avatarUrl;
    }
    if (!canonical.companyName && duplicate.companyName) {
      update.companyName = duplicate.companyName;
    }
  }

  return update;
}

function asMetadataRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}
