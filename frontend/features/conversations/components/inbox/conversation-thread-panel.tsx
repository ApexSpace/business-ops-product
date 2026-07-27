"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, MoreHorizontal, UserRound } from "lucide-react";
import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
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
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ThreadChannelFilter } from "@/features/conversations/components/inbox/thread-channel-filter";
import type { ThreadChannelFilterValue } from "@/features/conversations/components/inbox/thread-channel-filter";
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
import { ConversationChannelBadge } from "@/features/conversations/components/inbox/conversation-channel-display";
import {
  channelComposerHint,
  contactDisplayName,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import { unifiedThreadDisplayName } from "@/features/conversations/utils/unified-thread.utils";
import { isDeletableConversationMessage } from "@/features/conversations/utils/message-delete.util";
import {
  MessageComposer,
  type PendingMessageAttachment,
} from "@/features/conversations/components/inbox/message-composer";
import { ConversationInternalNotesPanel } from "@/features/conversations/components/inbox/conversation-internal-notes-panel";
import { ChatbotSessionActions } from "@/features/conversations/components/inbox/chatbot-session-actions";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import { removeMessageFromCache } from "@/features/realtime/event-handlers";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

const INBOX_THREAD_PANEL_CLASS =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-elevation-xs";

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
  threadChannels?: ConversationChannel[];
  threadChannelFilter?: ThreadChannelFilterValue;
  onThreadChannelFilterChange?: (value: ThreadChannelFilterValue) => void;
  replyChannels?: ContactReplyChannel[];
  selectedReplyChannel?: ConversationChannel | null;
  onReplyChannelChange?: (channel: ConversationChannel) => void;
  channelBarReadOnly?: boolean;
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
        headerMedia?: { type: string; url: string };
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
        headerMedia?: { type: string; url: string };
      };
    }
  >;
  onRetryMessage?: (message: ConversationMessage) => void;
  retryingMessageId?: string | null;
  canRetryMessages?: boolean;
  onBackToList?: () => void;
  onOpenContactDetails?: () => void;
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
  threadChannels = [],
  threadChannelFilter = "ALL",
  onThreadChannelFilterChange,
  replyChannels,
  selectedReplyChannel,
  onReplyChannelChange,
  channelBarReadOnly = false,
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
  className,
}: ConversationThreadPanelProps) {
  const { apiBase } = useConversationsHost();
  const queryClient = useQueryClient();
  const [messageDeleteMode, setMessageDeleteMode] = useState(false);
  const [pendingDeleteMessage, setPendingDeleteMessage] =
    useState<ConversationMessage | null>(null);
  const [cannotDeleteOpen, setCannotDeleteOpen] = useState(false);

  useEffect(() => {
    setMessageDeleteMode(false);
    setPendingDeleteMessage(null);
    setCannotDeleteOpen(false);
  }, [selectedId]);

  const contactId =
    selectedThread?.contactId ?? selected?.contactId ?? selected?.contact?.id;
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
  const headerChannel =
    selectedReplyChannel ??
    (threadChannels.length === 1 ? threadChannels[0] : null);

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
            <header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2 sm:px-4">
              {onBackToList ? (
                <IconButton
                  aria-label="Back to conversations"
                  className="size-7 shrink-0 md:hidden"
                  onClick={onBackToList}
                >
                  <ArrowLeft className="size-4" />
                </IconButton>
              ) : null}

              <ProfileAvatar
                name={threadDisplayName}
                avatarUrl={threadAvatarUrl}
                className="size-8 shrink-0"
                fallbackClassName="bg-primary/10 text-[10px] font-semibold text-primary"
              />

              <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                <p className="truncate text-sm font-semibold leading-none">
                  {threadDisplayName}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <IconButton
                        aria-label="Conversation actions"
                        className="size-7 shrink-0"
                      >
                        <MoreHorizontal className="size-3.5" />
                      </IconButton>
                    }
                  />
                  <DropdownMenuContent
                    align="start"
                    className="w-auto min-w-56"
                  >
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
                {headerChannel ? (
                  <ConversationChannelBadge
                    channel={headerChannel}
                    size="sm"
                    className="hidden shrink-0 sm:inline-flex"
                  />
                ) : null}
              </div>

              <div className="flex max-w-[58%] shrink-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                {messageDeleteMode ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => setMessageDeleteMode(false)}
                  >
                    Done
                  </Button>
                ) : null}
                {isClosed ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 shrink-0 px-2.5 text-xs"
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
                {onThreadChannelFilterChange ? (
                  <ThreadChannelFilter
                    channels={threadChannels}
                    value={threadChannelFilter}
                    onChange={onThreadChannelFilterChange}
                  />
                ) : null}
                {onOpenContactDetails ? (
                  <IconButton
                    aria-label="Contact details"
                    className="size-7 shrink-0 md:hidden"
                    onClick={onOpenContactDetails}
                  >
                    <UserRound className="size-3.5" />
                  </IconButton>
                ) : null}
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

            <div className="min-h-0 flex-1 overflow-hidden bg-muted/10">
              {messagesLoading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Loading messages…
                </p>
              ) : messages.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  {totalMessageCount > 0 && threadChannelFilter !== "ALL"
                    ? `No ${channelLabel(threadChannelFilter)} messages yet.`
                    : "No messages yet."}
                </p>
              ) : (
                <VirtualizedMessageList
                  key={messageScrollKey ?? selectedId}
                  scrollKey={messageScrollKey ?? selectedId}
                  messages={messages}
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

            <div className="shrink-0 border-t border-border/60 bg-background">
              <ConversationInternalNotesPanel conversationId={selectedId} />

              <MessageComposer
                variant="thread"
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
                channelBarReadOnly={channelBarReadOnly}
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
