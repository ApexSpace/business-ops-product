import {
  IntegrationResourceStatus,
  IntegrationResourceType,
} from '@prisma/client';
import {
  buildWhatsAppOverview,
  mapWhatsAppNumberResponse,
} from './whatsapp-number.util';

describe('whatsapp-number.util', () => {
  const resource = {
    id: 'res-1',
    businessIntegrationId: 'int-1',
    businessId: 'biz-1',
    providerKey: 'whatsapp',
    externalId: 'phone-1',
    name: 'Awais Business',
    type: IntegrationResourceType.PHONE_NUMBER,
    metadata: {
      wabaId: 'waba-1',
      wabaName: 'Awais WABA',
      displayPhoneNumber: '+923001234567',
      verifiedName: 'Awais Business',
      qualityRating: 'GREEN',
      messagingLimit: 'TIER_1K',
    },
    isSelected: true,
    isDefault: true,
    status: IntegrationResourceStatus.ACTIVE,
    lastSyncedAt: new Date('2026-06-12T12:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('maps integration resource metadata to a WhatsApp number DTO', () => {
    expect(mapWhatsAppNumberResponse(resource)).toEqual({
      id: 'res-1',
      phoneNumber: '+923001234567',
      displayName: 'Awais Business',
      messagingLimit: 'TIER_1K',
      qualityRating: 'GREEN',
      status: IntegrationResourceStatus.ACTIVE,
      lastSyncedAt: resource.lastSyncedAt,
      wabaId: 'waba-1',
      wabaName: 'Awais WABA',
      isDefault: true,
    });
  });

  it('builds overview for connected integrations', () => {
    const overview = buildWhatsAppOverview(
      true,
      {
        status: 'CONNECTED',
        connectedAccountName: 'Awais Business (dev bootstrap)',
      },
      resource,
    );

    expect(overview.connected).toBe(true);
    expect(overview.wabaName).toBe('Awais WABA');
    expect(overview.defaultPhoneNumber).toBe('+923001234567');
    expect(overview.defaultNumber?.id).toBe('res-1');
  });
});
