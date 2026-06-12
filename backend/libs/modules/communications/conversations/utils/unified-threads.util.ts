import {
  Contact,
  Conversation,
  ConversationChannel,
  ConversationStatus,
  User,
} from '@prisma/client';
import { UnifiedConversationThreadDto } from '../dto/unified-conversation-response.dto';
import { toConversationResponse } from '../mappers/conversation.mapper';

type ConversationWithRelations = Conversation & {
  contact?: Contact | null;
  assignedTo?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
};

const STATUS_RANK: Record<ConversationStatus, number> = {
  OPEN: 3,
  PENDING: 2,
  CLOSED: 1,
  SPAM: 0,
};

function pickPrimaryConversation(
  conversations: ConversationWithRelations[],
): ConversationWithRelations {
  return [...conversations].sort((a, b) => {
    const aTime = a.lastMessageAt?.getTime() ?? 0;
    const bTime = b.lastMessageAt?.getTime() ?? 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  })[0]!;
}

function pickThreadStatus(
  conversations: ConversationWithRelations[],
): ConversationStatus {
  return conversations.reduce<ConversationStatus>((best, row) => {
    return STATUS_RANK[row.status] > STATUS_RANK[best] ? row.status : best;
  }, ConversationStatus.CLOSED);
}

function buildThreadDto(
  threadKey: string,
  contactId: string | null,
  conversations: ConversationWithRelations[],
): UnifiedConversationThreadDto {
  const primary = pickPrimaryConversation(conversations);
  const channels = [
    ...new Set(conversations.map((row) => row.channel)),
  ] as ConversationChannel[];

  return {
    threadKey,
    contactId,
    contact: primary.contact
      ? {
          id: primary.contact.id,
          label:
            primary.contact.displayName?.trim() ||
            [primary.contact.firstName, primary.contact.lastName]
              .filter(Boolean)
              .join(' ') ||
            'Contact',
          avatarUrl: primary.contact.avatarUrl,
        }
      : null,
    channels,
    conversations: conversations.map((row) => toConversationResponse(row)),
    primaryConversationId: primary.id,
    status: pickThreadStatus(conversations),
    assignedToUserId: primary.assignedToUserId,
    assignedTo: primary.assignedTo
      ? {
          id: primary.assignedTo.id,
          firstName: primary.assignedTo.firstName,
          lastName: primary.assignedTo.lastName,
          email: primary.assignedTo.email,
        }
      : null,
    lastMessageAt: primary.lastMessageAt,
    lastMessagePreview: primary.lastMessagePreview,
    unreadCount: conversations.reduce((sum, row) => sum + row.unreadCount, 0),
  };
}

export function groupConversationsIntoUnifiedThreads(
  conversations: ConversationWithRelations[],
  options: { channel?: ConversationChannel } = {},
): UnifiedConversationThreadDto[] {
  const contactIdsMatchingChannel = options.channel
    ? new Set(
        conversations
          .filter((row) => row.channel === options.channel && row.contactId)
          .map((row) => row.contactId as string),
      )
    : null;

  const byContact = new Map<string, ConversationWithRelations[]>();
  const orphans: ConversationWithRelations[] = [];

  for (const row of conversations) {
    if (!row.contactId) {
      if (!options.channel || row.channel === options.channel) {
        orphans.push(row);
      }
      continue;
    }

    if (
      contactIdsMatchingChannel &&
      !contactIdsMatchingChannel.has(row.contactId)
    ) {
      continue;
    }

    const bucket = byContact.get(row.contactId) ?? [];
    bucket.push(row);
    byContact.set(row.contactId, bucket);
  }

  const grouped: UnifiedConversationThreadDto[] = [];

  for (const [contactId, rows] of byContact) {
    grouped.push(buildThreadDto(contactId, contactId, rows));
  }

  for (const row of orphans) {
    grouped.push(buildThreadDto(row.id, null, [row]));
  }

  return grouped.sort((a, b) => {
    const aTime = a.lastMessageAt?.getTime() ?? 0;
    const bTime = b.lastMessageAt?.getTime() ?? 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.threadKey.localeCompare(b.threadKey);
  });
}
