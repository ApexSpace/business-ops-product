import {
  Contact,
  Conversation,
  ConversationMessage,
  User,
} from '@prisma/client';
import {
  ConversationAssigneeDto,
  ConversationContactSummaryDto,
  ConversationMessageResponseDto,
  ConversationResponseDto,
} from '../dto/conversation-response.dto';

type ConversationWithRelations = Conversation & {
  contact?: Contact | null;
  assignedTo?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
};

function contactLabel(contact: Contact): string {
  if (contact.displayName?.trim()) return contact.displayName.trim();
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (contact.companyName?.trim()) return contact.companyName.trim();
  return 'Contact';
}

export function toConversationContactSummary(
  contact: Contact,
): ConversationContactSummaryDto {
  return {
    id: contact.id,
    label: contactLabel(contact),
    avatarUrl: contact.avatarUrl,
  };
}

export function toConversationResponse(
  row: ConversationWithRelations,
): ConversationResponseDto {
  return {
    id: row.id,
    businessId: row.businessId,
    contactId: row.contactId,
    channel: row.channel,
    providerKey: row.providerKey,
    resourceId: row.resourceId,
    externalConversationId: row.externalConversationId,
    externalParticipantId: row.externalParticipantId,
    externalPageId: row.externalPageId,
    title: row.title,
    status: row.status,
    assignedToUserId: row.assignedToUserId,
    lastMessageAt: row.lastMessageAt,
    lastMessagePreview: row.lastMessagePreview,
    unreadCount: row.unreadCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    contact: row.contact ? toConversationContactSummary(row.contact) : null,
    assignedTo: row.assignedTo
      ? {
          id: row.assignedTo.id,
          firstName: row.assignedTo.firstName,
          lastName: row.assignedTo.lastName,
          email: row.assignedTo.email,
        }
      : null,
  };
}

export function toConversationMessageResponse(
  row: ConversationMessage,
): ConversationMessageResponseDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    channel: row.channel,
    providerKey: row.providerKey,
    direction: row.direction,
    senderType: row.senderType,
    senderUserId: row.senderUserId,
    text: row.text,
    attachments: (row.attachments as unknown[] | null) ?? null,
    status: row.status,
    errorMessage: row.errorMessage,
    sentAt: row.sentAt,
    receivedAt: row.receivedAt,
    createdAt: row.createdAt,
  };
}
