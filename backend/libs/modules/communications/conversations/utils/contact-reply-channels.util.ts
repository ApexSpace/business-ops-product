import { Contact, Conversation, ConversationChannel } from '@prisma/client';

export type ReplyChannelCandidate = {
  channel: ConversationChannel;
  providerKey: string;
  hasIdentity: boolean;
  conversation: Conversation | null;
};

const CHANNEL_PROVIDER: Record<
  ConversationChannel,
  string | null
> = {
  [ConversationChannel.EMAIL]: 'email',
  [ConversationChannel.WHATSAPP]: 'whatsapp',
  [ConversationChannel.FACEBOOK]: 'facebook',
  [ConversationChannel.INSTAGRAM]: 'instagram',
  [ConversationChannel.SMS]: null,
  [ConversationChannel.WEBCHAT]: null,
  [ConversationChannel.LINKEDIN]: null,
};

function readMetadataString(
  metadata: unknown,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function contactHasPhone(contact: Contact): boolean {
  return Boolean(contact.phoneNumber?.replace(/\D/g, ''));
}

export function buildReplyChannelCandidates(
  contact: Contact,
  conversations: Conversation[],
): ReplyChannelCandidate[] {
  const metadata = contact.metadata;
  const byChannel = new Map<ConversationChannel, Conversation>();

  for (const conversation of conversations) {
    if (!byChannel.has(conversation.channel)) {
      byChannel.set(conversation.channel, conversation);
    }
  }

  const candidates: Array<{
    channel: ConversationChannel;
    hasIdentity: boolean;
  }> = [
    {
      channel: ConversationChannel.EMAIL,
      hasIdentity: Boolean(contact.email?.trim()),
    },
    {
      channel: ConversationChannel.WHATSAPP,
      hasIdentity:
        contactHasPhone(contact) ||
        Boolean(readMetadataString(metadata, 'whatsappWaId')),
    },
    {
      channel: ConversationChannel.FACEBOOK,
      hasIdentity: Boolean(readMetadataString(metadata, 'facebookPsid')),
    },
    {
      channel: ConversationChannel.INSTAGRAM,
      hasIdentity: Boolean(readMetadataString(metadata, 'instagramUserId')),
    },
  ];

  return candidates
    .map(({ channel, hasIdentity }) => {
      const providerKey = CHANNEL_PROVIDER[channel];
      if (!providerKey) {
        return null;
      }

      const conversation = byChannel.get(channel) ?? null;
      const available = hasIdentity || Boolean(conversation);

      if (!available) {
        return null;
      }

      return {
        channel,
        providerKey,
        hasIdentity,
        conversation,
      };
    })
    .filter((row): row is ReplyChannelCandidate => row !== null);
}
