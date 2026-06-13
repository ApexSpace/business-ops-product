"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PendingMessageAttachment } from "@/features/conversations/components/inbox/message-composer";
import { channelComposerHint } from "@/features/conversations/components/inbox/conversation-inbox-utils";
import {
  ensureContactConversation,
  listContactReplyChannels,
  sendConversationMessage,
  type ContactReplyChannel,
  type ConversationChannel,
  type EnsureContactConversationInput,
} from "@/features/conversations/api/conversations.api";
import { useContactMessages } from "@/features/conversations/hooks/use-contact-messages";
import {
  canSendViaReplyChannel,
  findReplyChannel,
  pickDefaultReplyChannel,
  replyChannelSendDisabledReason,
} from "@/features/conversations/utils/reply-channel.utils";
import { useWhatsAppTemplateComposerState } from "@/features/conversations/hooks/use-whatsapp-template-composer-state";
import { createOptimisticOutboundMessage } from "@/features/conversations/utils/optimistic-message";
import {
  appendMessageToContactCache,
  refetchContactMessagesCache,
  updateMessageInCache,
  upsertMessageInCache,
} from "@/features/realtime/event-handlers";
import { queryKeys } from "@/lib/query/keys";

export function useContactConversationComposer(contactId: string) {
  const queryClient = useQueryClient();
  const [composer, setComposer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingMessageAttachment | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [selectedReplyChannel, setSelectedReplyChannel] =
    useState<ConversationChannel | null>(null);

  const { data: replyChannels = [] } = useQuery({
    queryKey: queryKeys.conversations.replyChannels(contactId),
    queryFn: () => listContactReplyChannels(contactId),
    enabled: Boolean(contactId),
    staleTime: 10_000,
  });

  const {
    data: messagesInfinite,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContactMessages(contactId);

  useEffect(() => {
    void refetchContactMessagesCache(queryClient, contactId);
  }, [contactId, queryClient]);

  const messages = useMemo(
    () => messagesInfinite?.pages.flatMap((page) => page.items) ?? [],
    [messagesInfinite?.pages],
  );

  const defaultReplyChannel = useMemo(
    () => pickDefaultReplyChannel(replyChannels, undefined, messages),
    [replyChannels, messages],
  );

  const effectiveReplyChannel = selectedReplyChannel ?? defaultReplyChannel;

  const activeReplyChannel = useMemo(
    () => findReplyChannel(replyChannels, effectiveReplyChannel),
    [replyChannels, effectiveReplyChannel],
  );

  const {
    whatsAppMode,
    selectedTemplateId,
    handleTemplateIdChange,
    templateVariableValues,
    handleTemplateVariableValueChange,
    templateHeaderMediaUrl,
    setTemplateHeaderMediaUrl,
    hasTemplateContent,
    buildTemplatePayload,
    templatePreviewText,
    resetTemplateComposer,
  } = useWhatsAppTemplateComposerState({
    activeReplyChannel,
    messages,
    selectedReplyChannel: effectiveReplyChannel,
  });

  const handleReplyChannelChange = useCallback(
    (channel: ConversationChannel) => {
      setSelectedReplyChannel(channel);
      if (channel !== "EMAIL") {
        setEmailSubject("");
      }
    },
    [],
  );

  const resolveSendConversationId = useCallback(
    async (channel: ContactReplyChannel | null): Promise<string> => {
      if (!channel) {
        throw new Error("Select a reply channel.");
      }
      if (channel.conversationId) {
        return channel.conversationId;
      }

      const conversation = await ensureContactConversation(contactId, {
        channel: channel.channel as EnsureContactConversationInput["channel"],
        subject:
          channel.channel === "EMAIL" ? emailSubject.trim() || undefined : undefined,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.replyChannels(contactId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.byContact(contactId),
      });

      return conversation.id;
    },
    [contactId, emailSubject, queryClient],
  );

  const sendMutation = useMutation({
    mutationFn: async ({
      text,
      subject,
      attachments,
      template,
      replyChannel,
    }: {
      text: string;
      subject?: string;
      attachments?: Array<{ type: string; url: string }>;
      template?: {
        name: string;
        language: string;
        components?: unknown[];
        headerMedia?: { type: string; url: string };
      };
      replyChannel: ContactReplyChannel | null;
    }) => {
      const conversationId = await resolveSendConversationId(replyChannel);
      return sendConversationMessage(conversationId, {
        text: text || undefined,
        subject,
        attachments,
        template,
      }).then((result) => ({ ...result, conversationId }));
    },
    onMutate: async ({ text, attachments, replyChannel, template }) => {
      const conversationId = replyChannel?.conversationId ?? null;
      const sendChannel = replyChannel?.channel ?? "WHATSAPP";
      const sendProviderKey = replyChannel?.providerKey ?? "whatsapp";
      const trackingId = conversationId ?? `pending-${sendChannel}`;
      const optimisticText =
        text.trim() ||
        (template
          ? templatePreviewText ||
            (template.name ? `Template: ${template.name}` : "Template message")
          : "");

      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.contactMessages(contactId, 0),
      });

      const optimisticMessage = createOptimisticOutboundMessage({
        conversation: {
          id: conversationId ?? trackingId,
          channel: sendChannel,
          providerKey: sendProviderKey,
        },
        text: optimisticText,
        attachments,
      });

      appendMessageToContactCache(queryClient, contactId, optimisticMessage);

      setComposer("");
      setAttachmentUrl("");
      setPendingAttachment(null);
      if (template) {
        resetTemplateComposer();
      }

      return {
        optimisticId: optimisticMessage.id,
        conversationId,
        trackingId,
      };
    },
    onSuccess: async (data, _variables, context) => {
      const conversationId = data.conversationId;

      if (data.message) {
        upsertMessageInCache(
          queryClient,
          conversationId,
          data.message,
          contactId,
        );
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.unifiedList(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.replyChannels(contactId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.byContact(contactId),
      });
      await refetchContactMessagesCache(queryClient, contactId);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.optimisticId) {
        updateMessageInCache(
          queryClient,
          context.conversationId ?? context.trackingId,
          context.optimisticId,
          {
            status: "FAILED",
            errorMessage: error.message,
          },
          contactId,
        );
      }
      toast.error(error.message);
    },
  });

  const hasComposerContent =
    composer.trim().length > 0 || Boolean(pendingAttachment);

  const canSend =
    canSendViaReplyChannel(
      activeReplyChannel,
      undefined,
      hasComposerContent,
      whatsAppMode,
      hasTemplateContent,
    ) ||
    (activeReplyChannel?.channel === "EMAIL" &&
      hasComposerContent &&
      Boolean(contactId) &&
      (activeReplyChannel.readyForMessaging ||
        activeReplyChannel.messagingStatus.readyForMessaging));

  const sendDisabledReason = replyChannelSendDisabledReason(
    activeReplyChannel,
    undefined,
    whatsAppMode,
  );

  const channelHint = effectiveReplyChannel
    ? channelComposerHint(effectiveReplyChannel, {
        requiresTemplate: whatsAppMode?.requiresTemplate,
      })
    : null;

  return {
    messages,
    messagesLoading,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    replyChannels,
    effectiveReplyChannel,
    handleReplyChannelChange,
    composer,
    setComposer,
    attachmentUrl,
    setAttachmentUrl,
    pendingAttachment,
    setPendingAttachment,
    emailSubject,
    setEmailSubject,
    canSend,
    sendDisabledReason,
    channelHint,
    sendMutation,
    activeReplyChannel,
    whatsAppMode,
    selectedTemplateId,
    handleTemplateIdChange,
    templateVariableValues,
    handleTemplateVariableValueChange,
    templateHeaderMediaUrl,
    setTemplateHeaderMediaUrl,
    buildTemplatePayload,
    resetTemplateComposer,
  };
}
