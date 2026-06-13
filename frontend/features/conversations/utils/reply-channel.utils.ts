import type {
  ContactReplyChannel,
  Conversation,
  ConversationChannel,
  ConversationMessage,
  UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
import { isWebchatConversation } from "@/features/conversations/components/inbox/conversation-inbox-utils";
import { deriveWhatsAppSessionFromMessages } from "@/features/conversations/utils/whatsapp-template-send.util";
import { primaryConversation } from "@/features/conversations/utils/unified-thread.utils";

export interface WhatsAppComposerMode {
  requiresTemplate: boolean;
  sessionOpen: boolean;
}

export function resolveWhatsAppComposerMode(input: {
  channel: ContactReplyChannel | null;
  conversation?: Conversation | null;
  messages?: ConversationMessage[];
}): WhatsAppComposerMode | null {
  const isWhatsApp =
    input.channel?.channel === "WHATSAPP" ||
    input.conversation?.channel === "WHATSAPP";

  if (!isWhatsApp) {
    return null;
  }

  const whatsAppMessages =
    input.messages?.filter((message) => message.channel === "WHATSAPP") ?? [];

  if (whatsAppMessages.length > 0) {
    return deriveWhatsAppSessionFromMessages(whatsAppMessages);
  }

  if (input.channel?.requiresTemplate != null) {
    return {
      requiresTemplate: Boolean(input.channel.requiresTemplate),
      sessionOpen: Boolean(input.channel.sessionOpen),
    };
  }

  return { requiresTemplate: true, sessionOpen: false };
}

export function pickDefaultReplyChannel(
  channels: ContactReplyChannel[],
  thread: UnifiedConversationThread | undefined,
  messages: ConversationMessage[],
): ConversationChannel | null {
  if (channels.length === 0) return null;

  const latestMessage = messages[messages.length - 1];
  if (latestMessage) {
    const fromLatest = channels.find(
      (channel) => channel.channel === latestMessage.channel,
    );
    if (fromLatest) return fromLatest.channel;
  }

  const primary = thread ? primaryConversation(thread) : undefined;
  if (primary) {
    const fromPrimary = channels.find(
      (channel) => channel.channel === primary.channel,
    );
    if (fromPrimary) return fromPrimary.channel;
  }

  const ready = channels.find((channel) => channel.readyForMessaging);
  if (ready) return ready.channel;

  return channels[0]?.channel ?? null;
}

export function findReplyChannel(
  channels: ContactReplyChannel[],
  channel: ConversationChannel | null,
): ContactReplyChannel | null {
  if (!channel) return null;
  return channels.find((item) => item.channel === channel) ?? null;
}

export function replyChannelSendDisabledReason(
  channel: ContactReplyChannel | null,
  conversation: Conversation | undefined,
  whatsAppMode?: WhatsAppComposerMode | null,
): string | null {
  if (!channel) {
    return "Select a reply channel.";
  }

  if (isWebchatConversation(conversation)) {
    return null;
  }

  if (!channel.readyForMessaging) {
    if (channel.unavailableReason?.trim()) {
      return channel.unavailableReason.trim();
    }

    const warnings = channel.messagingStatus.warnings ?? [];
    if (warnings.length > 0) {
      return warnings.join(" ");
    }

    if (channel.providerKey === "facebook") {
      return "Select a Facebook Page and complete messaging setup before sending.";
    }

    if (channel.providerKey === "instagram") {
      return "Select an Instagram account and complete messaging setup before sending.";
    }

    if (channel.providerKey === "whatsapp") {
      return "Connect WhatsApp, select a default phone number, and complete messaging setup before sending.";
    }

    if (channel.providerKey === "email") {
      return "Platform email is not ready. Check integrations or server email settings.";
    }

    return "Messaging is not ready for this channel.";
  }

  if (whatsAppMode?.requiresTemplate) {
    return null;
  }

  return null;
}

export function canSendViaReplyChannel(
  channel: ContactReplyChannel | null,
  conversation: Conversation | undefined,
  hasContent: boolean,
  whatsAppMode?: WhatsAppComposerMode | null,
  hasTemplateContent = false,
): boolean {
  if (!channel) return false;
  if (isWebchatConversation(conversation)) return hasContent;

  if (!channel.readyForMessaging) {
    return false;
  }

  if (whatsAppMode?.requiresTemplate) {
    return hasTemplateContent;
  }

  return hasContent;
}
