import {
  buildCanonicalContactUpdate,
  groupContactsByEmail,
  groupContactsByPhone,
  pickCanonicalContact,
} from './contact-identity-merge.util';

function contact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contact-1',
    businessId: 'biz-1',
    firstName: 'A',
    lastName: null,
    displayName: null,
    companyName: null,
    email: null,
    phoneCountryCode: null,
    phoneNumber: null,
    timezone: null,
    address: null,
    city: null,
    state: null,
    country: null,
    zip: null,
    avatarUrl: null,
    source: null,
    metadata: null,
    createdById: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('contact-identity-merge.util', () => {
  it('groups contacts by normalized email', () => {
    const groups = groupContactsByEmail([
      contact({ id: 'a', email: 'User@Example.com' }),
      contact({ id: 'b', email: 'user@example.com' }),
      contact({ id: 'c', email: 'other@example.com' }),
    ]);

    expect(groups.get('user@example.com')).toHaveLength(2);
    expect(groups.get('other@example.com')).toHaveLength(1);
  });

  it('picks the most complete contact as canonical', () => {
    const canonical = pickCanonicalContact([
      contact({
        id: 'sparse',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      }),
      contact({
        id: 'rich',
        email: 'user@example.com',
        phoneNumber: '923001234567',
        phoneCountryCode: '+',
        metadata: { whatsappWaId: '923001234567' },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ]);

    expect(canonical.id).toBe('rich');
  });

  it('merges metadata and missing fields onto canonical contact', () => {
    const canonical = contact({
      id: 'canonical',
      email: 'user@example.com',
    });
    const duplicate = contact({
      id: 'duplicate',
      phoneNumber: '923001234567',
      phoneCountryCode: '+',
      metadata: { facebookPsid: 'psid-1' },
    });

    const update = buildCanonicalContactUpdate(canonical, [duplicate]);

    expect(update.phoneNumber).toBe('923001234567');
    expect(update.metadata).toEqual(
      expect.objectContaining({
        facebookPsid: 'psid-1',
        mergedAt: expect.any(String),
      }),
    );
  });

  it('groups contacts by normalized phone', () => {
    const groups = groupContactsByPhone([
      contact({
        id: 'a',
        phoneCountryCode: '+',
        phoneNumber: '923001234567',
      }),
      contact({
        id: 'b',
        phoneCountryCode: '+',
        phoneNumber: '923001234567',
      }),
    ]);

    expect([...groups.values()][0]).toHaveLength(2);
  });
});
