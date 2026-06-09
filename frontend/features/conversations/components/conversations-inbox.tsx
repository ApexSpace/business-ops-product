"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConversationListPanel } from "@/features/conversations/components/inbox/conversation-list-panel";
import { ConversationThreadPanel } from "@/features/conversations/components/inbox/conversation-thread-panel";
import {
  isWebchatConversation,
  VIRTUALIZE_THRESHOLD,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import {
  closeConversation,
  getConversation,
  getMessagingStatus,
  listConversations,
  markConversationRead,
  reopenConversation,
  sendConversationMessage,
} from "@/features/conversations/api/conversations.api";
import { useConversationMessages } from "@/features/conversations/hooks/use-conversation-messages";
import { useConversationsInboxFilters } from "@/features/conversations/hooks/use-conversations-inbox-filters";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import {
  markMessageSendComplete,
  markMessageSendPending,
  markMessageSendStart,
} from "@/lib/observability/message-send-latency";
import { queryKeys } from "@/lib/query/keys";

export function ConversationsInbox() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const conversationFromQuery = searchParams.get("conversation");
  const { filter, setFilter, search, setSearch, listFilters } =
    useConversationsInboxFilters();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{
    type: string;
    url: string;
  } | null>(null);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: queryKeys.conversations.list(listFilters),
    queryFn: () => listConversations(listFilters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const conversations = useMemo(() => {
    const items = listData?.items ?? [];
    if (filter === "unread") {
      return items.filter((c) => c.unreadCount > 0);
    }
    return items;
  }, [listData?.items, filter]);

  useEffect(() => {
    if (conversationFromQuery) {
      setSelectedId(conversationFromQuery);
      return;
    }

    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversationFromQuery, conversations, selectedId]);

  const { data: selected } = useQuery({
    queryKey: queryKeys.conversations.detail(selectedId ?? ""),
    queryFn: () => getConversation(selectedId!),
    enabled: Boolean(selectedId),
  });

  const {
    data: messagesInfinite,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(selectedId);

  const isWebchat = isWebchatConversation(selected);

  const messagingStatusQuery = useQuery({
    queryKey: queryKeys.integrations.messagingStatus(
      `${selected?.channel ?? ""}:${selected?.providerKey ?? ""}`,
    ),
    queryFn: () => getMessagingStatus(selected!.providerKey),
    enabled: Boolean(selected?.providerKey) && !isWebchat,
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all() });
  };

  const sendMutation = useMutation({
    mutationFn: ({
      id,
      text,
      attachments,
    }: {
      id: string;
      text: string;
      attachments?: Array<{ type: string; url: string }>;
    }) => {
      markMessageSendStart(id);
      markMessageSendPending(id);
      return sendConversationMessage(id, {
        text: text || undefined,
        attachments,
      });
    },
    onSuccess: async (_data, { id }) => {
      markMessageSendComplete(id);
      setComposer("");
      setAttachmentUrl("");
      setPendingAttachment(null);
      await invalidateAll();
      if (selectedId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages(selectedId, 0),
        });
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markConversationRead(id),
    onSuccess: invalidateAll,
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "close" | "reopen";
    }) => (action === "close" ? closeConversation(id) : reopenConversation(id)),
    onSuccess: invalidateAll,
  });

  useEffect(() => {
    if (selectedId && selected && selected.unreadCount > 0) {
      markReadMutation.mutate(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.unreadCount]);

  const canSend =
    Boolean(selectedId) &&
    (composer.trim().length > 0 || Boolean(pendingAttachment)) &&
    (isWebchat || Boolean(messagingStatusQuery.data?.readyForMessaging));

  const sendDisabledReason = useMemo(() => {
    if (isWebchat) {
      return null;
    }

    if (messagingStatusQuery.data?.readyForMessaging) {
      return null;
    }

    const warnings = messagingStatusQuery.data?.warnings ?? [];
    if (warnings.length > 0) {
      return warnings.join(" ");
    }

    if (selected?.providerKey === "facebook") {
      return "Select a Facebook Page and complete messaging setup before sending.";
    }

    if (selected?.providerKey === "instagram") {
      return "Select an Instagram account and complete messaging setup before sending.";
    }

    if (selected?.providerKey === "whatsapp") {
      return "Connect WhatsApp, select a default phone number, and complete messaging setup before sending.";
    }

    return "Messaging is not ready for this channel.";
  }, [
    isWebchat,
    messagingStatusQuery.data?.readyForMessaging,
    messagingStatusQuery.data?.warnings,
    selected?.providerKey,
  ]);

  const messages = useMemo(
    () => messagesInfinite?.pages.flatMap((page) => page.items) ?? [],
    [messagesInfinite?.pages],
  );

  const useVirtualThreads =
    isFeatureEnabled("virtualizedLists") &&
    conversations.length >= VIRTUALIZE_THRESHOLD;

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[520px] overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <ConversationListPanel
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        conversations={conversations}
        listLoading={listLoading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        useVirtualThreads={useVirtualThreads}
      />
      <ConversationThreadPanel
        selectedId={selectedId}
        selected={selected}
        messages={messages}
        messagesLoading={messagesLoading}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={() => void fetchNextPage()}
        composer={composer}
        onComposerChange={setComposer}
        attachmentUrl={attachmentUrl}
        onAttachmentUrlChange={setAttachmentUrl}
        pendingAttachment={pendingAttachment}
        onAddAttachment={() => {
          const url = attachmentUrl.trim();
          if (!url) return;
          setPendingAttachment({ type: "image", url });
          setAttachmentUrl("");
        }}
        onRemoveAttachment={() => setPendingAttachment(null)}
        canSend={canSend}
        sendDisabledReason={sendDisabledReason}
        sendMutation={sendMutation}
        statusMutation={statusMutation}
        onAssignSuccess={invalidateAll}
      />
    </div>
  );
}
