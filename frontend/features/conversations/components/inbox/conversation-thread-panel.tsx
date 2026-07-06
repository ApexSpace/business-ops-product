"use client";

import { ArrowLeft, MessageSquare, UserRound } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { VirtualizedMessageList } from "@/features/conversations/components/virtualized-message-list";
import { IconButton } from "@/components/ui/icon-button";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ThreadChannelFilter } from "@/features/conversations/components/inbox/thread-channel-filter";
import type { ThreadChannelFilterValue } from "@/features/conversations/components/inbox/thread-channel-filter";
import {
  channelLabel,
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
import {
  MessageComposer,
  type PendingMessageAttachment,
} from "@/features/conversations/components/inbox/message-composer";
import { ConversationInternalNotesPanel } from "@/features/conversations/components/inbox/conversation-internal-notes-panel";
import { ChatbotSessionActions } from "@/features/conversations/components/inbox/chatbot-session-actions";
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
  onBackToList,
  onOpenContactDetails,
  className,
}: ConversationThreadPanelProps) {
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
                {headerChannel ? (
                  <ConversationChannelBadge
                    channel={headerChannel}
                    size="sm"
                    className="hidden shrink-0 sm:inline-flex"
                  />
                ) : null}
              </div>

              <div className="flex max-w-[58%] shrink-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:overflow-visible [&::-webkit-scrollbar]:hidden">
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
                showCannedResponses={selectedReplyChannel === "WEBCHAT"}
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
    </section>
  );
}
