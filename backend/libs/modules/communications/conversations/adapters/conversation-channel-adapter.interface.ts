import { ConversationChannel } from '@prisma/client';

export interface SendChannelMessageParams {
  businessId: string;
  resourceId: string;
  externalRecipientId: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface SendChannelMessageResult {
  externalMessageId: string | null;
  metadata?: Record<string, unknown>;
}

export interface ConversationChannelAdapter {
  getProviderKey(): string;
  getChannel(): ConversationChannel;
  sendMessage(params: SendChannelMessageParams): Promise<SendChannelMessageResult>;
}
