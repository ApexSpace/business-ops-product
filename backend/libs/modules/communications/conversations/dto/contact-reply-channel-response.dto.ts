import { ConversationChannel } from '@prisma/client';
import { MessagingStatusDto } from '@app/modules/integrations/integrations/services/messaging-status.service';

export class ContactReplyChannelDto {
  channel!: ConversationChannel;
  providerKey!: string;
  conversationId!: string | null;
  readyForMessaging!: boolean;
  messagingStatus!: MessagingStatusDto;
  unavailableReason!: string | null;
  sessionOpen?: boolean | null;
  requiresTemplate?: boolean | null;
}
