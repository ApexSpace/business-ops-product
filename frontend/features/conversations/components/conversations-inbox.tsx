"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConversationListPanel } from "@/features/conversations/components/inbox/conversation-list-panel";
import { ConversationThreadPanel } from "@/features/conversations/components/inbox/conversation-thread-panel";
import { VIRTUALIZE_THRESHOLD } from "@/features/conversations/components/inbox/conversation-inbox-utils";
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
  const { filter, setFilter, search, setSearch, listFilters } =
    useConversationsInboxFilters();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");

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
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

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

  const messagingStatusQuery = useQuery({
    queryKey: queryKeys.integrations.messagingStatus(selected?.providerKey ?? ""),
    queryFn: () => getMessagingStatus(selected!.providerKey),
    enabled: Boolean(selected?.providerKey),
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all() });
  };

  const sendMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => {
      markMessageSendStart(id);
      markMessageSendPending(id);
      return sendConversationMessage(id, text);
    },
    onSuccess: async (_data, { id }) => {
      markMessageSendComplete(id);
      setComposer("");
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
    composer.trim().length > 0 &&
    (messagingStatusQuery.data?.readyForMessaging ?? false);

  const sendDisabledReason = !messagingStatusQuery.data?.readyForMessaging
    ? selected?.providerKey === "facebook"
      ? "Select a Facebook Page and complete messaging setup before sending."
      : selected?.providerKey === "instagram"
        ? "Select an Instagram account and complete messaging setup before sending."
        : "Messaging is not ready for this channel."
    : null;

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
        canSend={canSend}
        sendDisabledReason={sendDisabledReason}
        sendMutation={sendMutation}
        statusMutation={statusMutation}
      />
    </div>
  );
}
