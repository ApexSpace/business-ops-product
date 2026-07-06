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
import { ArrowLeft } from "lucide-react";
import { ConversationListPanel } from "@/features/conversations/components/inbox/conversation-list-panel";
import { ConversationInboxContactSidebar } from "@/features/conversations/components/inbox/conversation-inbox-contact-sidebar";
import { ConversationsInboxColumns } from "@/features/conversations/components/inbox/conversations-inbox-columns";
import { ConversationThreadPanel } from "@/features/conversations/components/inbox/conversation-thread-panel";
import type { ThreadChannelFilterValue } from "@/features/conversations/components/inbox/thread-channel-filter";
import { filterMessagesByThreadChannel } from "@/features/conversations/components/inbox/thread-channel-filter";
import { ContactWorkspaceShell } from "@/features/contacts/components/contact-workspace/contact-workspace-shell";
import { useConversationInboxContactSidebar } from "@/features/conversations/hooks/use-conversation-inbox-contact-sidebar";
import { WORKSPACE_PADDING_CLASS } from "@/features/contacts/workspace/contact-workspace";
import { NewEmailDialog } from "@/features/conversations/components/inbox/new-email-dialog";
import { Button } from "@/components/ui/button";
import { getPlatformDefaultEmail } from "@/features/integrations/api/integrations.api";
import type { PendingMessageAttachment } from "@/features/conversations/components/inbox/message-composer";
import { mergeConversationMessagePages } from "@/features/conversations/utils/merge-message-pages";
import {
  isWebchatConversation,
  VIRTUALIZE_THRESHOLD,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import {
  ensureContactConversation,
  getConversation,
  getMessagingStatus,
  listContactReplyChannels,
  listUnifiedConversations,
  markConversationRead,
  sendConversationMessage,
  type ContactReplyChannel,
  type ConversationChannel,
  type EnsureContactConversationInput,
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
import { useWhatsAppTemplateComposerState } from "@/features/conversations/hooks/use-whatsapp-template-composer-state";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";
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
import { cn } from "@/lib/utils";

type InboxMobilePane = "list" | "thread" | "contact";

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
  const { search, setSearch, listFilters } = useConversationsInboxFilters();
  const [manualThreadKey, setManualThreadKey] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingMessageAttachment | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [newEmailOpen, setNewEmailOpen] = useState(false);
  const [selectedReplyChannel, setSelectedReplyChannel] =
    useState<ConversationChannel | null>(null);
  const [threadChannelFilter, setThreadChannelFilter] =
    useState<ThreadChannelFilterValue>("ALL");
  const [mobilePane, setMobilePane] = useState<InboxMobilePane>("list");
  const { hasCapability } = useBusinessAccess();
  const canSendMessages = hasCapability("conversations.send");

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

  const threads = useMemo(() => listData?.items ?? [], [listData?.items]);

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
      setThreadChannelFilter("ALL");
      setEmailSubject("");
      setMobilePane("thread");
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
    if (!activeThread) {
      setMobilePane("list");
      return;
    }
    if (threadFromQuery || conversationFromQuery || manualThreadKey) {
      setMobilePane((pane) => (pane === "list" ? "thread" : pane));
    }
  }, [
    activeThread,
    conversationFromQuery,
    manualThreadKey,
    threadFromQuery,
  ]);

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
      setThreadChannelFilter(channel);
      setEmailSubject("");
    },
    [],
  );

  const handleThreadChannelFilterChange = useCallback(
    (filter: ThreadChannelFilterValue) => {
      setThreadChannelFilter(filter);
      if (filter === "ALL") {
        return;
      }
      setSelectedReplyChannel(filter);
      setEmailSubject("");
    },
    [],
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
    () => mergeConversationMessagePages(messagesInfinite?.pages),
    [messagesInfinite?.pages],
  );

  const filteredMessages = useMemo(
    () => filterMessagesByThreadChannel(messages, threadChannelFilter),
    [messages, threadChannelFilter],
  );

  const messageScrollKey = mergedTimeline
    ? `${activeThread?.threadKey ?? ""}:${threadChannelFilter}`
    : `${orphanConversationId ?? ""}:${threadChannelFilter}`;

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

  const webchatConversationId = useMemo(
    () =>
      activeThread?.conversations.find((conversation) => conversation.channel === "WEBCHAT")
        ?.id ?? null,
    [activeThread?.conversations],
  );

  const replyConversationId = mergedTimeline
    ? activeReplyChannel?.conversationId ??
      (effectiveReplyChannel === "WEBCHAT" || threadChannelFilter === "WEBCHAT"
        ? webchatConversationId
        : null)
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

  const threadChannels = useMemo(() => {
    if (activeThread?.channels.length) {
      return activeThread.channels;
    }
    if (threadConversation?.channel) {
      return [threadConversation.channel];
    }
    return [];
  }, [activeThread?.channels, threadConversation?.channel]);

  const sidebarContactId =
    activeThread?.contactId ?? threadConversation?.contactId ?? null;
  const contactSidebar = useConversationInboxContactSidebar(sidebarContactId);

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
    activeReplyChannel: mergedTimeline ? activeReplyChannel : null,
    conversation: threadConversation,
    messages,
    selectedReplyChannel: effectiveReplyChannel,
  });

  const isWebchat = isWebchatConversation(threadConversation);

  const messagingStatusQuery = useQuery({
    queryKey: queryKeys.integrations.messagingStatus(
      `${threadConversation?.channel ?? ""}:${threadConversation?.providerKey ?? ""}`,
    ),
    queryFn: () => getMessagingStatus(threadConversation!.providerKey),
    enabled:
      Boolean(threadConversation?.providerKey) && !isWebchat && !mergedTimeline,
  });

  const composerReplyChannels = useMemo((): ContactReplyChannel[] => {
    if (mergedTimeline) {
      return replyChannels;
    }
    if (!threadConversation?.channel) {
      return [];
    }
    const ready =
      isWebchat || (messagingStatusQuery.data?.readyForMessaging ?? false);
    return [
      {
        channel: threadConversation.channel,
        providerKey: threadConversation.providerKey ?? "",
        conversationId: threadConversation.id,
        readyForMessaging: ready,
        messagingStatus: messagingStatusQuery.data ?? {
          connected: false,
          defaultResourceSelected: false,
          webhookEndpointConfigured: false,
          requiredPermissionsPresent: false,
          readyForMessaging: isWebchat,
          warnings: [],
        },
        unavailableReason: null,
      },
    ];
  }, [
    mergedTimeline,
    replyChannels,
    threadConversation,
    isWebchat,
    messagingStatusQuery.data,
  ]);

  const composerReplyChannel = mergedTimeline
    ? effectiveReplyChannel
    : (threadConversation?.channel ?? null);

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
          channel: channel.channel as EnsureContactConversationInput["channel"],
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
      const conversationId = mergedTimeline
        ? await resolveSendConversationId(replyChannel)
        : orphanConversationId!;
      return sendConversationMessage(conversationId, {
        text: text || undefined,
        subject,
        attachments,
        template,
      }).then((result) => ({ ...result, conversationId }));
    },
    onMutate: async ({ text, attachments, replyChannel, template }) => {
      const conversationId = mergedTimeline
        ? replyChannel?.conversationId ?? null
        : orphanConversationId;
      const sendChannel =
        replyChannel?.channel ?? threadConversation?.channel ?? "WHATSAPP";
      const sendProviderKey =
        replyChannel?.providerKey ?? threadConversation?.providerKey ?? "whatsapp";
      const trackingId = conversationId ?? `pending-${sendChannel}`;
      const optimisticText =
        text.trim() ||
        (template
          ? templatePreviewText ||
            (template.name ? `Template: ${template.name}` : "Template message")
          : "");

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
        text: optimisticText,
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

  const canSend =
    canSendMessages &&
    (mergedTimeline
      ? canSendViaReplyChannel(
          activeReplyChannel,
          threadConversation,
          hasComposerContent,
          whatsAppMode,
          hasTemplateContent,
        ) ||
        (activeReplyChannel?.channel === "EMAIL" &&
          hasComposerContent &&
          Boolean(contactId) &&
          (activeReplyChannel.readyForMessaging ||
            activeReplyChannel.messagingStatus.readyForMessaging))
      : Boolean(orphanConversationId) &&
        hasComposerContent &&
        (isWebchat || Boolean(messagingStatusQuery.data?.readyForMessaging)));

  const sendDisabledReason = useMemo(() => {
    if (!canSendMessages) {
      return "You do not have permission to send messages.";
    }
    if (mergedTimeline) {
      return replyChannelSendDisabledReason(
        activeReplyChannel,
        threadConversation,
        whatsAppMode,
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
    canSendMessages,
    isWebchat,
    mergedTimeline,
    messagingStatusQuery.data?.readyForMessaging,
    messagingStatusQuery.data?.warnings,
    threadConversation,
    whatsAppMode,
  ]);

  const useVirtualThreads =
    isFeatureEnabled("virtualizedLists") &&
    threads.length >= VIRTUALIZE_THRESHOLD;

  const listPanel = (
    <ConversationListPanel
      search={search}
      onSearchChange={setSearch}
      threads={threads}
      listLoading={listLoading}
      selectedThreadKey={activeThread?.threadKey ?? null}
      onSelectThread={selectThread}
      useVirtualThreads={useVirtualThreads}
      onNewEmail={() => setNewEmailOpen(true)}
      className="h-full w-full"
    />
  );

  const threadPanel = (
    <ConversationThreadPanel
      selectedId={statusConversationId}
      selected={threadConversation}
      selectedThread={activeThread}
      messages={filteredMessages}
      totalMessageCount={messages.length}
      messagesLoading={messagesLoading}
      hasNextPage={hasNextPage ?? false}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={() => void fetchNextPage()}
      messageScrollKey={messageScrollKey}
      threadChannels={threadChannels}
      threadChannelFilter={threadChannelFilter}
      onThreadChannelFilterChange={
        threadChannels.length > 1 ? handleThreadChannelFilterChange : undefined
      }
      replyChannels={composerReplyChannels}
      selectedReplyChannel={composerReplyChannel}
      onReplyChannelChange={
        mergedTimeline ? handleReplyChannelChange : undefined
      }
      channelBarReadOnly={mergedTimeline && threadChannelFilter !== "ALL"}
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
      recipientEmail={contactSidebar.contact?.email ?? null}
      whatsAppRequiresTemplate={Boolean(whatsAppMode?.requiresTemplate)}
      selectedTemplateId={selectedTemplateId}
      onTemplateIdChange={handleTemplateIdChange}
      templateVariableValues={templateVariableValues}
      onTemplateVariableValueChange={handleTemplateVariableValueChange}
      templateHeaderMediaUrl={templateHeaderMediaUrl}
      onTemplateHeaderMediaUrlChange={setTemplateHeaderMediaUrl}
      buildTemplatePayload={buildTemplatePayload}
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
      onBackToList={() => setMobilePane("list")}
      onOpenContactDetails={() => setMobilePane("contact")}
      className="h-full w-full"
    />
  );

  const contactSidebarPanel = (
    <ConversationInboxContactSidebar
      sidebarState={contactSidebar}
      selected={threadConversation}
      selectedThread={activeThread}
      className="h-full w-full"
    />
  );

  return (
    <ContactWorkspaceShell>
      <RealtimeOfflineBanner />
      <div className="hidden min-h-0 flex-1 overflow-hidden md:flex">
        <ConversationsInboxColumns
          className="min-h-0 flex-1"
          list={listPanel}
          thread={threadPanel}
          sidebar={contactSidebarPanel}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
        <div
          className={cn(
            "min-h-0 flex-1 overflow-hidden",
            WORKSPACE_PADDING_CLASS,
            mobilePane !== "list" && "hidden",
          )}
        >
          {listPanel}
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-hidden",
            WORKSPACE_PADDING_CLASS,
            mobilePane !== "thread" && "hidden",
          )}
        >
          {threadPanel}
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            mobilePane !== "contact" && "hidden",
          )}
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-border/80 px-3 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={() => setMobilePane("thread")}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <span className="text-sm font-semibold">Contact details</span>
          </header>
          <div
            className={cn(
              "min-h-0 flex-1 overflow-hidden pb-2",
              WORKSPACE_PADDING_CLASS,
            )}
          >
            <ConversationInboxContactSidebar
              sidebarState={contactSidebar}
              selected={threadConversation}
              selectedThread={activeThread}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>

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

    </ContactWorkspaceShell>
  );
}

