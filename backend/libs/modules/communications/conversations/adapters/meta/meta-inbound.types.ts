import { ConversationChannel } from '@prisma/client';

export interface NormalizedInboundMessage {
  channel: ConversationChannel;
  providerKey: string;
  externalResourceId: string;
  externalConversationId: string;
  externalParticipantId: string;
  externalPageId: string | null;
  externalMessageId: string;
  externalSenderId: string;
  externalRecipientId: string;
  text: string | null;
  attachments: unknown[] | null;
  timestamp: Date;
  senderName: string | null;
  senderProfilePictureUrl: string | null;
  rawMetadata?: Record<string, unknown>;
}
