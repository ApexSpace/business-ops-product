import { ConversationChannel } from '@prisma/client';
import {
  resolveMetaParticipantId,
  resolveWhatsAppParticipantId,
} from './contact-outbound-identity.util';

describe('contact-outbound-identity.util', () => {
  it('resolves WhatsApp participant from phone fields', () => {
    expect(
      resolveWhatsAppParticipantId({
        metadata: null,
        phoneCountryCode: '+92',
        phoneNumber: '3014863718',
      } as never),
    ).toBe('923014863718');
  });

  it('prefers stored whatsappWaId metadata', () => {
    expect(
      resolveWhatsAppParticipantId({
        metadata: { whatsappWaId: '923001234567' },
        phoneCountryCode: '+1',
        phoneNumber: '5551234',
      } as never),
    ).toBe('923001234567');
  });

  it('resolves Facebook participant from metadata', () => {
    expect(
      resolveMetaParticipantId(
        {
          metadata: { facebookPsid: 'psid-123' },
        } as never,
        ConversationChannel.FACEBOOK,
      ),
    ).toBe('psid-123');
  });
});
