"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  retryConversationMessage,
  sendConversationMessage,
  type ConversationMessage,
} from "@/features/conversations/api/conversations.api";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import { isOptimisticMessageId } from "@/features/conversations/utils/optimistic-message";
import { parseMessageAttachments } from "@/features/conversations/utils/message-attachments";
import {
  updateMessageInCache,
  upsertMessageInCache,
} from "@/features/realtime/event-handlers";

function buildOptimisticRetryPayload(message: ConversationMessage) {
  const attachments = parseMessageAttachments(message.attachments)
    .filter(
      (item): item is { type: string; url: string; title?: string | null } =>
        typeof item.url === "string" && item.url.length > 0,
    )
    .map((item) => ({ type: item.type, url: item.url }));

  return {
    text: message.text?.trim() || undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

export function useRetryConversationMessage(options?: {
  contactId?: string | null;
  enabled?: boolean;
}) {
  const { apiBase } = useConversationsHost();
  const queryClient = useQueryClient();
  const contactId = options?.contactId ?? null;
  const enabled = options?.enabled ?? true;

  const mutation = useMutation({
    mutationFn: async (message: ConversationMessage) => {
      if (!enabled) {
        throw new Error("You do not have permission to send messages.");
      }

      if (isOptimisticMessageId(message.id)) {
        const payload = buildOptimisticRetryPayload(message);
        if (!payload.text && !payload.attachments?.length) {
          throw new Error("Nothing to retry for this message.");
        }
        return sendConversationMessage(
          message.conversationId,
          payload,
          apiBase,
        ).then((result) => ({
          ...result,
          conversationId: message.conversationId,
          optimisticId: message.id,
        }));
      }

      return retryConversationMessage(
        message.conversationId,
        message.id,
        apiBase,
      ).then((result) => ({
        ...result,
        conversationId: message.conversationId,
        optimisticId: null as string | null,
      }));
    },
    onMutate: async (message) => {
      updateMessageInCache(
        queryClient,
        message.conversationId,
        message.id,
        { status: "PENDING", errorMessage: null },
        contactId,
        apiBase,
      );
      return { message,
};
    },
    onSuccess: (data) => {
      upsertMessageInCache(
        queryClient,
        data.conversationId,
        data.message,
        contactId,
        apiBase,
      );
    },
    onError: (error, message) => {
      updateMessageInCache(
        queryClient,
        message.conversationId,
        message.id,
        {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Retry failed",
        },
        contactId,
        apiBase,
      );
      toast.error(error instanceof Error ? error.message : "Failed to retry message");
    },
  });

  return {
    retryMessage: (message: ConversationMessage) => {
      if (!enabled || mutation.isPending) return;
      mutation.mutate(message);
    },
    isRetrying: mutation.isPending,
    retryingMessageId: mutation.isPending
      ? (mutation.variables?.id ?? null)
      : null,
  };
}
