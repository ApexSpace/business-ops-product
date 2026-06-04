import {
  ConversationChannel,
  ConversationStatus,
  ConversationDirection,
  MessageStatus,
  MessageSenderType,
} from '@prisma/client';

export class ConversationContactSummaryDto {
  id!: string;
  label!: string;
  avatarUrl!: string | null;
}

export class ConversationAssigneeDto {
  id!: string;
  firstName!: string | null;
  lastName!: string | null;
  email!: string;
}

export class ConversationResponseDto {
  id!: string;
  businessId!: string;
  contactId!: string | null;
  channel!: ConversationChannel;
  providerKey!: string;
  resourceId!: string | null;
  externalConversationId!: string;
  externalParticipantId!: string;
  externalPageId!: string | null;
  title!: string | null;
  status!: ConversationStatus;
  assignedToUserId!: string | null;
  lastMessageAt!: Date | null;
  lastMessagePreview!: string | null;
  unreadCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
  contact?: ConversationContactSummaryDto | null;
  assignedTo?: ConversationAssigneeDto | null;
}

export class ConversationMessageResponseDto {
  id!: string;
  conversationId!: string;
  channel!: ConversationChannel;
  providerKey!: string;
  direction!: ConversationDirection;
  senderType!: MessageSenderType;
  senderUserId!: string | null;
  text!: string | null;
  attachments!: unknown[] | null;
  status!: MessageStatus;
  errorMessage!: string | null;
  sentAt!: Date | null;
  receivedAt!: Date | null;
  createdAt!: Date;
}
