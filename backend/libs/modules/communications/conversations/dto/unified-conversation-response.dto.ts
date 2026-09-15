import { ConversationChannel, ConversationStatus } from '@prisma/client';
import {
  ConversationAssigneeDto,
  ConversationContactSummaryDto,
  ConversationResponseDto,
} from './conversation-response.dto';

export class UnifiedConversationThreadDto {
  /** Stable key for UI selection: contactId or orphan conversation id */
  threadKey!: string;
  contactId!: string | null;
  contact!: ConversationContactSummaryDto | null;
  channels!: ConversationChannel[];
  conversations!: ConversationResponseDto[];
  /** Most recently active conversation in this thread */
  primaryConversationId!: string;
  status!: ConversationStatus;
  assignedToUserId!: string | null;
  assignedTo!: ConversationAssigneeDto | null;
  lastMessageAt!: Date | null;
  lastMessagePreview!: string | null;
  unreadCount!: number;
}
