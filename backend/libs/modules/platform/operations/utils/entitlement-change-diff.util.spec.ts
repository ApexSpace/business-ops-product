import {
  formatEntitlementChangeDetail,
  mergeEntitlementChangeDiff,
  type EntitlementChangeDiff,
} from './entitlement-change-diff.util';

describe('entitlement-change-diff.util', () => {
  const sampleDiff: EntitlementChangeDiff = {
    capabilities: {
      removed: [
        {
          id: 'c1',
          key: 'messaging',
          name: 'Messaging',
          services: [
            { key: 'sms.send', name: 'SMS', moduleName: 'Communications' },
            { key: 'chat', name: 'Chat', moduleName: 'Communications' },
          ],
        },
      ],
      after: [
        {
          id: 'c2',
          key: 'booking',
          name: 'Booking',
          services: [{ key: 'appointments', name: 'Appointments' }],
        },
      ],
      added: [],
    },
    services: {
      capability: { id: 'c1', key: 'messaging', name: 'Messaging' },
      removed: [{ key: 'sms.send', name: 'SMS', moduleName: 'Communications' }],
      after: [{ key: 'chat', name: 'Chat', moduleName: 'Communications' }],
    },
    addons: {
      removed: [
        {
          id: 'a1',
          key: 'reviews',
          name: 'Reviews Plus',
          priceMonthly: '29',
          capability: { id: 'c3', key: 'reviews', name: 'Reviews' },
          services: [{ key: 'reviews.manage', name: 'Manage reviews' }],
        },
      ],
    },
  };

  it('formats capability removals with nested services', () => {
    const text = formatEntitlementChangeDetail({
      type: 'TIER_CAPABILITY',
      diff: {
        capabilities: sampleDiff.capabilities,
      },
    });

    expect(text).toContain('Capabilities removed from your tier');
    expect(text).toContain('Messaging — services: SMS, Chat');
    expect(text).toContain('Capabilities remaining on your tier');
    expect(text).toContain('Booking — services: Appointments');
  });

  it('formats service removals with remaining inventory', () => {
    const text = formatEntitlementChangeDetail({
      type: 'CAPABILITY_FEATURE',
      diff: { services: sampleDiff.services },
    });

    expect(text).toContain('Services removed in Messaging');
    expect(text).toContain('SMS (Communications)');
    expect(text).toContain('Services still included in Messaging');
    expect(text).toContain('Chat (Communications)');
  });

  it('formats addon packaging with capability and services', () => {
    const text = formatEntitlementChangeDetail({
      type: 'ADDON_PACKAGING',
      diff: { addons: sampleDiff.addons },
    });

    expect(text).toContain('Add-ons no longer included with your tier');
    expect(text).toContain('Reviews Plus');
    expect(text).toContain('capability: Reviews');
    expect(text).toContain('services: Manage reviews');
  });

  it('merges removed service keys across campaign updates', () => {
    const merged = mergeEntitlementChangeDiff(
      {
        services: {
          removed: [{ key: 'a', name: 'A' }],
        },
      },
      {
        services: {
          removed: [{ key: 'b', name: 'B' }],
          after: [{ key: 'c', name: 'C' }],
        },
      },
    );

    expect(merged.services?.removed?.map((s) => s.key).sort()).toEqual([
      'a',
      'b',
    ]);
    expect(merged.services?.after).toEqual([{ key: 'c', name: 'C' }]);
  });
});
