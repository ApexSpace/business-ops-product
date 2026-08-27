"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VirtualizedMessageList } from "@/features/conversations/components/virtualized-message-list";
import { IconButton } from "@/components/ui/icon-button";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import {
  ThreadChannelFilter,
  filterMessagesByThreadChannel,
  type ThreadChannelFilterValue,
} from "@/features/conversations/components/inbox/thread-channel-filter";
import {
  blockConversationContact,
  channelLabel,
  closeConversation,
  deleteConversationMessage,
  markConversationSpam,
  reopenConversation,
  unblockConversationContact,
  unmarkConversationSpam,
  type ContactReplyChannel,
  type Conversation,
  type ConversationChannel,
  type ConversationMessage,
  type UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
import {
  channelComposerHint,
  contactDisplayName,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import {
  createConversationNote,
  listConversationNotes,
} from "@/features/conversations/api/conversation-notes.api";
import { unifiedThreadDisplayName } from "@/features/conversations/utils/unified-thread.utils";
import { isDeletableConversationMessage } from "@/features/conversations/utils/message-delete.util";
import {
  MessageComposer,
  type PendingMessageAttachment,
} from "@/features/conversations/components/inbox/message-composer";
import { ChatbotSessionActions } from "@/features/conversations/components/inbox/chatbot-session-actions";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import { removeMessageFromCache } from "@/features/realtime/event-handlers";
import { queryKeys } from "@/lib/query/keys";
import {
  INBOX_THREAD_HEADER_CLASS,
  INBOX_THREAD_PANEL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";
import { cn } from "@/lib/utils";

interface ConversationThreadPanelProps {
  selectedId: string | null;
  selected: Conversation | undefined;
  selectedThread?: UnifiedConversationThread;
  messages: ConversationMessage[];
  totalMessageCount?: number;
  messagesLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  messageScrollKey?: string | null;
  replyChannels?: ContactReplyChannel[];
  selectedReplyChannel?: ConversationChannel | null;
  onReplyChannelChange?: (channel: ConversationChannel) => void;
  composer: string;
  onComposerChange: (value: string) => void;
  attachmentUrl: string;
  onAttachmentUrlChange: (value: string) => void;
  pendingAttachment: PendingMessageAttachment | null;
  onAddAttachment: () => void;
  onRemoveAttachment: () => void;
  canSend: boolean;
  sendDisabledReason: string | null;
  emailSubject: string;
  onEmailSubjectChange: (value: string) => void;
  recipientEmail?: string | null;
  whatsAppRequiresTemplate?: boolean;
  selectedTemplateId?: string | null;
  onTemplateIdChange?: (templateId: string | null) => void;
  templateVariableValues?: Record<string, string>;
  onTemplateVariableValueChange?: (key: string, value: string) => void;
  templateHeaderMediaUrl?: string;
  onTemplateHeaderMediaUrlChange?: (value: string) => void;
  buildTemplatePayload?: () =>
    | {
        name: string;
        language: string;
        components?: unknown[];
        headerMedia?: { type: string; url: string,
};
      }
    | undefined;
  sendMutation: UseMutationResult<
    unknown,
    Error,
    {
      text: string;
      subject?: string;
      attachments?: Array<{ type: string; url: string }>;
      template?: {
        name: string;
        language: string;
        components?: unknown[];
        headerMedia?: { type: string; url: string,
};
      };
    }
  >;
  onRetryMessage?: (message: ConversationMessage) => void;
  retryingMessageId?: string | null;
  canRetryMessages?: boolean;
  onBackToList?: () => void;
  onOpenContactDetails?: () => void;
  clientSinceLabel?: string | null;
  className?: string;
}

export function ConversationThreadPanel({
  selectedId,
  selected,
  selectedThread,
  messages,
  totalMessageCount = 0,
  messagesLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  messageScrollKey = null,
  replyChannels,
  selectedReplyChannel,
  onReplyChannelChange,
  composer,
  onComposerChange,
  attachmentUrl,
  onAttachmentUrlChange,
  pendingAttachment,
  onAddAttachment,
  onRemoveAttachment,
  canSend,
  sendDisabledReason,
  emailSubject,
  onEmailSubjectChange,
  recipientEmail,
  whatsAppRequiresTemplate = false,
  selectedTemplateId = null,
  onTemplateIdChange,
  templateVariableValues = {},
  onTemplateVariableValueChange,
  templateHeaderMediaUrl = "",
  onTemplateHeaderMediaUrlChange,
  buildTemplatePayload,
  sendMutation,
  onRetryMessage,
  retryingMessageId = null,
  canRetryMessages = true,
  onBackToList,
  onOpenContactDetails,
  clientSinceLabel,
  className,
}: ConversationThreadPanelProps) {
  const { apiBase } = useConversationsHost();
  const queryClient = useQueryClient();
  const [messageDeleteMode, setMessageDeleteMode] = useState(false);
  const [pendingDeleteMessage, setPendingDeleteMessage] =
    useState<ConversationMessage | null>(null);
  const [cannotDeleteOpen, setCannotDeleteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [composerTab, setComposerTab] = useState<"reply" | "note">("reply");
  const [threadChannelFilter, setThreadChannelFilter] =
    useState<ThreadChannelFilterValue>("ALL");

  useEffect(() => {
    setMessageDeleteMode(false);
    setPendingDeleteMessage(null);
    setCannotDeleteOpen(false);
    setNoteDraft("");
    setComposerTab("reply");
    setThreadChannelFilter("ALL");
  }, [selectedId]);

  const contactId =
    selectedThread?.contactId ?? selected?.contactId ?? selected?.contact?.id;
  const threadChannels: ConversationChannel[] = selectedThread?.channels.length
    ? selectedThread.channels
    : selected?.channel
      ? [selected.channel]
      : [];
  const visibleMessages =
    composerTab === "note"
      ? filterMessagesByThreadChannel(messages, threadChannelFilter)
      : messages;
  const isBlocked = Boolean(
    selected?.contact?.isBlocked ?? selectedThread?.contact?.isBlocked,
  );
  const status = selected?.status;
  const isSpam = status === "SPAM";
  const isClosed = status === "CLOSED";
  const isOpen = status === "OPEN" || status === "PENDING";

  const invalidateConversationQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.all(apiBase),
    });
    if (selectedId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(selectedId, apiBase),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(selectedId, 0, apiBase),
      });
    }
    if (contactId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.detail(contactId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.contactMessages(contactId, 0, apiBase),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.byContact(contactId, apiBase),
      });
    }
  };

  const notesQuery = useQuery({
    queryKey: queryKeys.conversations.notes(selectedId ?? "", apiBase),
    queryFn: () => listConversationNotes(selectedId!, apiBase),
    enabled: Boolean(selectedId),
  });

  const createNoteMutation = useMutation({
    mutationFn: (body: string) =>
      createConversationNote(selectedId!, body, apiBase),
    onSuccess: () => {
      setNoteDraft("");
      if (selectedId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.notes(selectedId, apiBase),
        });
      }
      toast.success("Internal note added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (message: ConversationMessage) =>
      deleteConversationMessage(message.conversationId, message.id, apiBase),
    onSuccess: (_data, message) => {
      removeMessageFromCache(
        queryClient,
        message.conversationId,
        message.id,
        selectedThread?.contactId ?? selected?.contactId,
        apiBase,
      );
      toast.success("Message deleted");
      setPendingDeleteMessage(null);
      setMessageDeleteMode(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: async (
      action:
        | "close"
        | "reopen"
        | "mark-spam"
        | "unmark-spam"
        | "block"
        | "unblock",
    ) => {
      if (!selectedId) throw new Error("No conversation selected");
      switch (action) {
        case "close":
          return closeConversation(selectedId, apiBase);
        case "reopen":
          return reopenConversation(selectedId, apiBase);
        case "mark-spam":
          return markConversationSpam(selectedId, apiBase);
        case "unmark-spam":
          return unmarkConversationSpam(selectedId, apiBase);
        case "block":
          return blockConversationContact(selectedId, apiBase);
        case "unblock":
          return unblockConversationContact(selectedId, apiBase);
      }
    },
    onSuccess: (_data, action) => {
      invalidateConversationQueries();
      const messagesByAction: Record<typeof action, string> = {
        close: "Conversation closed",
        reopen: "Conversation reopened",
        "mark-spam": "Marked as spam",
        "unmark-spam": "Marked as not spam",
        block: "Contact blocked",
        unblock: "Contact unblocked",
      };
      toast.success(messagesByAction[action]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const threadDisplayName = selected
    ? selectedThread
      ? unifiedThreadDisplayName(selectedThread)
      : contactDisplayName(selected)
    : "";
  const threadAvatarUrl =
    selectedThread?.contact?.avatarUrl ?? selected?.contact?.avatarUrl ?? null;

  function handleRequestDeleteMessage(message: ConversationMessage) {
    if (!isDeletableConversationMessage(message)) {
      setCannotDeleteOpen(true);
      return;
    }
    setPendingDeleteMessage(message);
  }

  return (
    <section className={cn(INBOX_THREAD_PANEL_CLASS, className)}>
        {!selectedId || !selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare className="mb-3 size-10 opacity-40" />
            <p className="text-sm">Select a conversation to start.</p>
          </div>
        ) : (
          <>
            <header className={INBOX_THREAD_HEADER_CLASS}>
              {onBackToList ? (
                <IconButton
                  aria-label="Back to conversations"
                  size="icon-sm"
                  className="size-[var(--control-height-sm)] shrink-0 rounded-full md:hidden"
                  onClick={onBackToList}
                >
                  <ArrowLeft className="size-4" />
                </IconButton>
              ) : null}

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold leading-tight text-foreground">
                  {threadDisplayName}
                </p>
                {clientSinceLabel ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {clientSinceLabel}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {messageDeleteMode ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-[var(--control-height-sm)] shrink-0"
                    onClick={() => setMessageDeleteMode(false)}
                  >
                    Done
                  </Button>
                ) : null}
                {isClosed ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="brand"
                    className="h-[var(--control-height-sm)] shrink-0"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("reopen")}
                  >
                    Reopen
                  </Button>
                ) : null}
                {selected.channel === "WEBCHAT" ? (
                  <ChatbotSessionActions
                    conversationId={selectedId}
                    botPaused={selected.chatbotBotPaused}
                  />
                ) : null}
                {composerTab === "note" ? (
                  <ThreadChannelFilter
                    channels={threadChannels}
                    value={threadChannelFilter}
                    onChange={setThreadChannelFilter}
                  />
                ) : null}
                {onOpenContactDetails ? (
                  <IconButton
                    aria-label="Contact details"
                    size="icon-sm"
                    className="size-[var(--control-height-sm)] shrink-0 rounded-full lg:hidden"
                    onClick={onOpenContactDetails}
                  >
                    <UserRound className="size-3.5" />
                  </IconButton>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <MoreActionsButton aria-label="Conversation actions" />
                    }
                  />
                  <DropdownMenuContent align="end" className="w-auto min-w-56">
                    {messageDeleteMode ? (
                      <DropdownMenuItem
                        onClick={() => setMessageDeleteMode(false)}
                      >
                        Cancel message selection
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => setMessageDeleteMode(true)}
                      >
                        Select message to delete…
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {contactId ? (
                      <DropdownMenuItem
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate(isBlocked ? "unblock" : "block")
                        }
                      >
                        {isBlocked ? "Unblock contact" : "Block contact"}
                      </DropdownMenuItem>
                    ) : null}
                    {isSpam ? (
                      <DropdownMenuItem
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate("unmark-spam")}
                      >
                        Mark as not spam
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate("mark-spam")}
                      >
                        Mark as spam
                      </DropdownMenuItem>
                    )}
                    {isOpen ? (
                      <DropdownMenuItem
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate("close")}
                      >
                        Close conversation
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {isSpam ? (
              <div
                className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100 sm:px-4"
                role="status"
              >
                <p className="min-w-0 flex-1 leading-snug">
                  Conversation marked as spam.{" "}
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("unmark-spam")}
                  >
                    Mark as not spam
                  </button>{" "}
                  to reply.
                </p>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-hidden bg-white">
              {messagesLoading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Loading messages…
                </p>
              ) : visibleMessages.length === 0 &&
                !(notesQuery.data && notesQuery.data.length > 0) ? (
                <p className="px-6 py-6 text-sm text-muted-foreground">
                  {totalMessageCount > 0 &&
                  composerTab === "note" &&
                  threadChannelFilter !== "ALL"
                    ? `No ${channelLabel(threadChannelFilter)} messages yet.`
                    : "No messages yet."}
                </p>
              ) : (
                <VirtualizedMessageList
                  key={`${messageScrollKey ?? selectedId}:${composerTab}:${threadChannelFilter}`}
                  scrollKey={`${messageScrollKey ?? selectedId}:${composerTab}:${threadChannelFilter}`}
                  messages={visibleMessages}
                  notes={notesQuery.data ?? []}
                  hasMore={hasNextPage}
                  isLoadingMore={isFetchingNextPage}
                  onLoadMore={() => void fetchNextPage()}
                  variant="thread"
                  threadContext={{
                    contactName: threadDisplayName,
                    contactAvatarUrl: threadAvatarUrl,
                  }}
                  messageDeleteMode={messageDeleteMode}
                  onRequestDeleteMessage={handleRequestDeleteMessage}
                  onRetryMessage={onRetryMessage}
                  retryingMessageId={retryingMessageId}
                  canRetryMessages={canRetryMessages}
                />
              )}
            </div>

            <div className="shrink-0 bg-white">
              <MessageComposer
                variant="thread"
                composerTab={composerTab}
                onComposerTabChange={setComposerTab}
                noteDraft={noteDraft}
                onNoteDraftChange={setNoteDraft}
                onCreateNote={() => {
                  const body = noteDraft.trim();
                  if (!body) return;
                  createNoteMutation.mutate(body);
                }}
                notePending={createNoteMutation.isPending}
                composer={composer}
                onComposerChange={onComposerChange}
                attachmentUrl={attachmentUrl}
                onAttachmentUrlChange={onAttachmentUrlChange}
                pendingAttachment={pendingAttachment}
                onAddAttachment={onAddAttachment}
                onRemoveAttachment={onRemoveAttachment}
                canSend={canSend}
                sendDisabledReason={sendDisabledReason}
                channelHint={
                  selectedReplyChannel
                    ? channelComposerHint(selectedReplyChannel, {
                        requiresTemplate: whatsAppRequiresTemplate,
                      })
                    : null
                }
                showSubject={selectedReplyChannel === "EMAIL"}
                subject={emailSubject}
                onSubjectChange={onEmailSubjectChange}
                recipientEmail={recipientEmail}
                channelBarChannels={replyChannels}
                channelBarValue={selectedReplyChannel}
                onChannelBarChange={onReplyChannelChange}
                whatsAppRequiresTemplate={whatsAppRequiresTemplate}
                selectedTemplateId={selectedTemplateId}
                onTemplateIdChange={onTemplateIdChange}
                templateVariableValues={templateVariableValues}
                onTemplateVariableValueChange={onTemplateVariableValueChange}
                templateHeaderMediaUrl={templateHeaderMediaUrl}
                onTemplateHeaderMediaUrlChange={onTemplateHeaderMediaUrlChange}
                showCannedResponses
                onSend={() => {
                  const template = whatsAppRequiresTemplate
                    ? buildTemplatePayload?.()
                    : undefined;
                  sendMutation.mutate({
                    text: template ? "" : composer.trim(),
                    subject:
                      selectedReplyChannel === "EMAIL"
                        ? emailSubject.trim() || undefined
                        : undefined,
                    attachments: template
                      ? undefined
                      : pendingAttachment
                        ? [pendingAttachment]
                        : undefined,
                    template,
                  });
                }}
              />
            </div>
          </>
        )}

      <ConfirmDeleteDialog
        open={pendingDeleteMessage !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteMessage(null);
        }}
        title="Delete message?"
        description="This message will be removed from the conversation. This can’t be undone."
        confirmLabel="OK"
        pendingLabel="Deleting…"
        isPending={deleteMessageMutation.isPending}
        onConfirm={() => {
          if (pendingDeleteMessage) {
            deleteMessageMutation.mutate(pendingDeleteMessage);
          }
        }}
      />

      <AlertDialog open={cannotDeleteOpen} onOpenChange={setCannotDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This is an automated message and cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
