import { ConversationChannel } from '@prisma/client';

export interface ChannelMessageAttachment {
  type: string;
  url: string;
}

export interface WhatsAppTemplateSendParams {
  name: string;
  language: string;
  components?: unknown[];
  headerMedia?: { type: string; url: string };
}

export interface SendChannelMessageParams {
  businessId: string;
  resourceId: string;
  externalRecipientId: string;
  text: string;
  attachments?: ChannelMessageAttachment[];
  metadata?: Record<string, unknown>;
  template?: WhatsAppTemplateSendParams;
}

export interface SendChannelMessageResult {
  externalMessageId: string | null;
  metadata?: Record<string, unknown>;
}

export interface ConversationChannelAdapter {
  getProviderKey(): string;
  getChannel(): ConversationChannel;
  sendMessage(
    params: SendChannelMessageParams,
  ): Promise<SendChannelMessageResult>;
}
