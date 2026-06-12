"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ConversationListPanel } from "@/features/conversations/components/inbox/conversation-list-panel";
import { ConversationThreadPanel } from "@/features/conversations/components/inbox/conversation-thread-panel";
import { NewEmailDialog } from "@/features/conversations/components/inbox/new-email-dialog";
import { getPlatformDefaultEmail } from "@/features/integrations/api/integrations.api";
import type { PendingMessageAttachment } from "@/features/conversations/components/inbox/message-composer";
import {
  isWebchatConversation,
  VIRTUALIZE_THRESHOLD,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import {
  closeConversation,
  ensureContactConversation,
  getConversation,
  getMessagingStatus,
  listContactReplyChannels,
  listUnifiedConversations,
  markConversationRead,
  reopenConversation,
  sendConversationMessage,
  type ContactReplyChannel,
  type ConversationChannel,
  type UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
import { useContactMessages } from "@/features/conversations/hooks/use-contact-messages";
import { useConversationMessages } from "@/features/conversations/hooks/use-conversation-messages";
import {
  canSendViaReplyChannel,
  findReplyChannel,
  pickDefaultReplyChannel,
  replyChannelSendDisabledReason,
} from "@/features/conversations/utils/reply-channel.utils";
import { useConversationsInboxFilters } from "@/features/conversations/hooks/use-conversations-inbox-filters";
import { RealtimeOfflineBanner } from "@/features/realtime/components/realtime-offline-banner";
import { createOptimisticOutboundMessage } from "@/features/conversations/utils/optimistic-message";
import {
  buildInboxThreadSearchParams,
  resolveActiveInboxThread,
} from "@/features/conversations/utils/inbox-thread-selection.util";
import { findUnifiedThreadByConversationId } from "@/features/conversations/utils/unified-thread.utils";
import {
  appendMessageToCache,
  appendMessageToContactCache,
  patchConversationPreviewInCache,
  refetchContactMessagesCache,
  updateMessageInCache,
  upsertMessageInCache,
} from "@/features/realtime/event-handlers";
import { useRealtimeMode } from "@/features/realtime/realtime-mode-context";
import {
  getRealtimePollIntervalMs,
  isAnyRealtimeTransportEnabled,
} from "@/features/realtime/realtime-polling";
import {
  markMessageSendComplete,
  markMessageSendPending,
  markMessageSendStart,
} from "@/lib/observability/message-send-latency";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { queryKeys } from "@/lib/query/keys";

export function ConversationsInbox() {
  const queryClient = useQueryClient();
  const realtimeMode = useRealtimeMode();
  const pollInterval = isAnyRealtimeTransportEnabled()
    ? getRealtimePollIntervalMs(realtimeMode)
    : 5_000;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const threadFromQuery = searchParams.get("thread");
  const conversationFromQuery = searchParams.get("conversation");
  const { filter, setFilter, search, setSearch, listFilters } =
    useConversationsInboxFilters();
  const [manualThreadKey, setManualThreadKey] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingMessageAttachment | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [newEmailOpen, setNewEmailOpen] = useState(false);
  const [selectedReplyChannel, setSelectedReplyChannel] =
    useState<ConversationChannel | null>(null);

  useQuery({
    queryKey: queryKeys.integrations.platformEmail(),
    queryFn: () => getPlatformDefaultEmail(),
    staleTime: 60_000,
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: queryKeys.conversations.unifiedList(listFilters),
    queryFn: () => listUnifiedConversations(listFilters),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchInterval: pollInterval,
  });

  const threads = useMemo(() => {
    const items = listData?.items ?? [];
    if (filter === "unread") {
      return items.filter((thread) => thread.unreadCount > 0);
    }
    return items;
  }, [listData?.items, filter]);

  const threadsReady = !listLoading;

  const activeThread = useMemo(
    () =>
      resolveActiveInboxThread({
        threads,
        threadsReady,
        manualThreadKey,
        threadFromQuery,
        conversationFromQuery,
      }),
    [
      threads,
      threadsReady,
      manualThreadKey,
      threadFromQuery,
      conversationFromQuery,
    ],
  );

  const contactId = activeThread?.contactId ?? null;
  const mergedTimeline = Boolean(contactId);
  const orphanConversationId =
    activeThread && !activeThread.contactId
      ? activeThread.primaryConversationId
      : null;

  const selectThread = useCallback(
    (thread: UnifiedConversationThread) => {
      setManualThreadKey(thread.threadKey);
      setSelectedReplyChannel(null);
      setEmailSubject("");
      const params = buildInboxThreadSearchParams(thread, searchParams);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      if (thread.contactId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.contactMessages(thread.contactId, 0),
        });
      }
    },
    [queryClient, pathname, router, searchParams],
  );

  useEffect(() => {
    if (!threadsReady || !activeThread || manualThreadKey) return;
    if (threadFromQuery === activeThread.threadKey) return;

    const params = buildInboxThreadSearchParams(activeThread, searchParams);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    activeThread,
    manualThreadKey,
    pathname,
    router,
    searchParams,
    threadFromQuery,
    threadsReady,
  ]);

  const handleReplyChannelChange = useCallback(
    (channel: ConversationChannel) => {
      setSelectedReplyChannel(channel);
      if (channel === "EMAIL") {
        const emailConversation = activeThread?.conversations.find(
          (conversation) => conversation.channel === "EMAIL",
        );
        setEmailSubject(emailConversation?.title ?? "");
      } else {
        setEmailSubject("");
      }
    },
    [activeThread?.conversations],
  );

  const { data: replyChannels = [] } = useQuery({
    queryKey: queryKeys.conversations.replyChannels(contactId ?? ""),
    queryFn: () => listContactReplyChannels(contactId!),
    enabled: Boolean(contactId),
    staleTime: 10_000,
  });

  const statusConversationId = activeThread?.primaryConversationId ?? null;

  const {
    data: contactMessagesInfinite,
    isLoading: contactMessagesLoading,
    fetchNextPage: fetchNextContactPage,
    hasNextPage: hasNextContactPage,
    isFetchingNextPage: isFetchingNextContactPage,
  } = useContactMessages(mergedTimeline ? contactId : null);

  const {
    data: conversationMessagesInfinite,
    isLoading: conversationMessagesLoading,
    fetchNextPage: fetchNextConversationPage,
    hasNextPage: hasNextConversationPage,
    isFetchingNextPage: isFetchingNextConversationPage,
  } = useConversationMessages(mergedTimeline ? null : orphanConversationId);

  const messagesInfinite = mergedTimeline
    ? contactMessagesInfinite
    : conversationMessagesInfinite;
  const messagesLoading =
    !activeThread ||
    (mergedTimeline ? contactMessagesLoading : conversationMessagesLoading);
  const fetchNextPage = mergedTimeline
    ? fetchNextContactPage
    : fetchNextConversationPage;
  const hasNextPage = mergedTimeline
    ? hasNextContactPage
    : hasNextConversationPage;
  const isFetchingNextPage = mergedTimeline
    ? isFetchingNextContactPage
    : isFetchingNextConversationPage;

  const messages = useMemo(
    () => messagesInfinite?.pages.flatMap((page) => page.items) ?? [],
    [messagesInfinite?.pages],
  );

  const defaultReplyChannel = useMemo(
    () =>
      mergedTimeline && replyChannels.length > 0
        ? pickDefaultReplyChannel(replyChannels, activeThread, messages)
        : null,
    [mergedTimeline, replyChannels, activeThread, messages],
  );

  const effectiveReplyChannel = selectedReplyChannel ?? defaultReplyChannel;

  const activeReplyChannel = useMemo(
    () => findReplyChannel(replyChannels, effectiveReplyChannel),
    [replyChannels, effectiveReplyChannel],
  );

  const replyConversationId = mergedTimeline
    ? activeReplyChannel?.conversationId ?? null
    : orphanConversationId;

  const { data: selected } = useQuery({
    queryKey: queryKeys.conversations.detail(replyConversationId ?? ""),
    queryFn: () => getConversation(replyConversationId!),
    enabled: Boolean(replyConversationId),
  });

  const { data: statusConversation } = useQuery({
    queryKey: queryKeys.conversations.detail(statusConversationId ?? ""),
    queryFn: () => getConversation(statusConversationId!),
    enabled: Boolean(statusConversationId) && mergedTimeline,
  });

  const threadConversation = mergedTimeline
    ? (selected ?? statusConversation)
    : selected;

  const isWebchat = isWebchatConversation(threadConversation);

  const messagingStatusQuery = useQuery({
    queryKey: queryKeys.integrations.messagingStatus(
      `${threadConversation?.channel ?? ""}:${threadConversation?.providerKey ?? ""}`,
    ),
    queryFn: () => getMessagingStatus(threadConversation!.providerKey),
    enabled:
      Boolean(threadConversation?.providerKey) && !isWebchat && !mergedTimeline,
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all() });
  };

  const resolveSendConversationId = useCallback(
    async (channel: ContactReplyChannel | null): Promise<string> => {
      if (!channel) {
        throw new Error("Select a reply channel.");
      }
      if (channel.conversationId) {
        return channel.conversationId;
      }
      if (contactId) {
        const conversation = await ensureContactConversation(contactId, {
          channel: channel.channel,
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.replyChannels(contactId),
        });
        return conversation.id;
      }
      throw new Error(
        channel.unavailableReason ??
          "No conversation for this channel. Add contact details or complete channel setup.",
      );
    },
    [contactId, queryClient],
  );

  const sendMutation = useMutation({
    mutationFn: async ({
      text,
      subject,
      attachments,
      replyChannel,
    }: {
      text: string;
      subject?: string;
      attachments?: Array<{ type: string; url: string }>;
      replyChannel: ContactReplyChannel | null;
    }) => {
      const conversationId = mergedTimeline
        ? await resolveSendConversationId(replyChannel)
        : orphanConversationId!;
      return sendConversationMessage(conversationId, {
        text: text || undefined,
        subject,
        attachments,
      }).then((result) => ({ ...result, conversationId }));
    },
    onMutate: async ({ text, attachments, replyChannel }) => {
      const conversationId = mergedTimeline
        ? replyChannel?.conversationId ?? null
        : orphanConversationId;
      const sendChannel =
        replyChannel?.channel ?? threadConversation?.channel ?? "WHATSAPP";
      const sendProviderKey =
        replyChannel?.providerKey ?? threadConversation?.providerKey ?? "whatsapp";
      const trackingId = conversationId ?? `pending-${sendChannel}`;

      markMessageSendStart(trackingId);
      markMessageSendPending(trackingId);

      if (contactId) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.conversations.contactMessages(contactId, 0),
        });
      }
      if (conversationId) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.conversations.messages(conversationId, 0),
        });
      }

      const optimisticMessage = createOptimisticOutboundMessage({
        conversation: {
          id: conversationId ?? trackingId,
          channel: sendChannel,
          providerKey: sendProviderKey,
        },
        text,
        attachments,
      });

      if (contactId) {
        appendMessageToContactCache(queryClient, contactId, optimisticMessage);
      }
      if (conversationId) {
        appendMessageToCache(
          queryClient,
          conversationId,
          optimisticMessage,
          contactId,
        );
        const preview = text.trim() || attachments?.[0]?.url || "Attachment";
        patchConversationPreviewInCache(queryClient, conversationId, preview);
      }

      setComposer("");
      setAttachmentUrl("");
      setPendingAttachment(null);

      return {
        optimisticId: optimisticMessage.id,
        conversationId,
        trackingId,
      };
    },
    onSuccess: async (data, _variables, context) => {
      const conversationId = data.conversationId;
      markMessageSendComplete(context?.trackingId ?? conversationId);

      if (data.message) {
        upsertMessageInCache(
          queryClient,
          conversationId,
          data.message,
          contactId,
        );
      }

      const preview =
        data.message.text?.trim() ||
        _variables.text.trim() ||
        (_variables.attachments?.[0]?.url ?? "Attachment");
      patchConversationPreviewInCache(queryClient, conversationId, preview);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.unifiedList(),
      });
      if (contactId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.replyChannels(contactId),
        });
        await refetchContactMessagesCache(queryClient, contactId);
      }
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
    if (!activeThread) return;

    for (const conversation of activeThread.conversations) {
      if (conversation.unreadCount > 0) {
        markReadMutation.mutate(conversation.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThread?.threadKey, activeThread?.conversations]);

  const hasComposerContent =
    composer.trim().length > 0 || Boolean(pendingAttachment);

  const canSend = mergedTimeline
    ? canSendViaReplyChannel(
        activeReplyChannel,
        threadConversation,
        hasComposerContent,
      ) ||
      (activeReplyChannel?.channel === "EMAIL" &&
        hasComposerContent &&
        Boolean(contactId) &&
        (activeReplyChannel.readyForMessaging ||
          activeReplyChannel.messagingStatus.readyForMessaging))
    : Boolean(orphanConversationId) &&
      hasComposerContent &&
      (isWebchat || Boolean(messagingStatusQuery.data?.readyForMessaging));

  const sendDisabledReason = useMemo(() => {
    if (mergedTimeline) {
      return replyChannelSendDisabledReason(
        activeReplyChannel,
        threadConversation,
      );
    }

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

    if (threadConversation?.providerKey === "facebook") {
      return "Select a Facebook Page and complete messaging setup before sending.";
    }

    if (threadConversation?.providerKey === "instagram") {
      return "Select an Instagram account and complete messaging setup before sending.";
    }

    if (threadConversation?.providerKey === "whatsapp") {
      return "Connect WhatsApp, select a default phone number, and complete messaging setup before sending.";
    }

    if (threadConversation?.providerKey === "email") {
      return "Platform email is not ready. Check integrations or server email settings.";
    }

    return "Messaging is not ready for this channel.";
  }, [
    activeReplyChannel,
    isWebchat,
    mergedTimeline,
    messagingStatusQuery.data?.readyForMessaging,
    messagingStatusQuery.data?.warnings,
    threadConversation,
  ]);

  const useVirtualThreads =
    isFeatureEnabled("virtualizedLists") &&
    threads.length >= VIRTUALIZE_THRESHOLD;

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <RealtimeOfflineBanner />
      <div className="flex h-[min(720px,calc(100svh-12rem))] min-h-[420px] overflow-hidden">
      <ConversationListPanel
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        threads={threads}
        listLoading={listLoading}
        selectedThreadKey={activeThread?.threadKey ?? null}
        onSelectThread={selectThread}
        useVirtualThreads={useVirtualThreads}
        onNewEmail={() => setNewEmailOpen(true)}
      />
      <ConversationThreadPanel
        selectedId={statusConversationId}
        selected={threadConversation}
        selectedThread={activeThread}
        messages={messages}
        messagesLoading={messagesLoading}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={() => void fetchNextPage()}
        mergedTimeline={mergedTimeline}
        replyChannels={mergedTimeline ? replyChannels : undefined}
        selectedReplyChannel={mergedTimeline ? effectiveReplyChannel : undefined}
        onReplyChannelChange={
          mergedTimeline ? handleReplyChannelChange : undefined
        }
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
        emailSubject={emailSubject}
        onEmailSubjectChange={setEmailSubject}
        sendMutation={{
          ...sendMutation,
          mutate: (variables) =>
            sendMutation.mutate({
              ...variables,
              replyChannel: activeReplyChannel,
            }),
          mutateAsync: (variables) =>
            sendMutation.mutateAsync({
              ...variables,
              replyChannel: activeReplyChannel,
            }),
        }}
        statusMutation={statusMutation}
        onAssignSuccess={invalidateAll}
      />
      <NewEmailDialog
        open={newEmailOpen}
        onOpenChange={setNewEmailOpen}
        onCreated={async (conversationId) => {
          await invalidateAll();
          const refreshed = await listUnifiedConversations(listFilters);
          const matched = findUnifiedThreadByConversationId(
            refreshed.items,
            conversationId,
          );
          if (matched) {
            selectThread(matched);
          }
        }}
      />
      </div>
    </div>
  );
}

