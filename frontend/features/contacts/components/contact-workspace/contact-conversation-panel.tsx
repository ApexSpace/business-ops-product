"use client";

import Link from "next/link";
import { ExternalLink, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { MessageComposer } from "@/features/conversations/components/inbox/message-composer";
import { VirtualizedMessageList } from "@/features/conversations/components/virtualized-message-list";
import { useContactConversationComposer } from "@/features/contacts/hooks/use-contact-conversation-composer";
import { cn } from "@/lib/utils";

const CONTACT_CONVERSATION_PANEL_CLASS =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-border/60 bg-background shadow-elevation-xs";

interface ContactConversationPanelProps {
  contactId: string;
  contactName: string;
  contactEmail?: string | null;
  contactAvatarUrl?: string | null;
  businessName?: string | null;
  className?: string;
}

export function ContactConversationPanel({
  contactId,
  contactName,
  contactEmail,
  contactAvatarUrl,
  businessName,
  className,
}: ContactConversationPanelProps) {
  const {
    messages,
    messagesLoading,
    fetchNextPage,
    hasNextPage,
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
  } = useContactConversationComposer(contactId);

  const inboxHref = `/business/conversations?thread=${encodeURIComponent(contactId)}`;
  const showEmailSubject = effectiveReplyChannel === "EMAIL";
  const hasChannels = replyChannels.length > 0;

  return (
    <section className={cn(CONTACT_CONVERSATION_PANEL_CLASS, className)}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar
            name={contactName}
            avatarUrl={contactAvatarUrl}
            className="size-10"
            fallbackClassName="bg-primary/10 text-sm font-medium text-primary"
          />
          <h2 className="truncate text-base font-semibold">{contactName}</h2>
        </div>
        <Link
          href={inboxHref}
          aria-label="Open in inbox"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60"
        >
          <ExternalLink className="size-4" />
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden bg-muted/15">
        {messagesLoading ? (
          <LoadingState
            variant="inline"
            label="Loading messages…"
            className="px-4 py-3"
          />
        ) : !hasChannels ? (
          <EmptyState
            compact
            className="h-full justify-center px-4"
            icon={
              <MessageSquare className="size-4 text-muted-foreground/70" aria-hidden />
            }
            title={`Add a phone number or email to ${contactName} to start messaging.`}
          />
        ) : messages.length === 0 ? (
          <EmptyState
            compact
            className="h-full justify-center px-4"
            icon={
              <MessageSquare className="size-4 text-muted-foreground/70" aria-hidden />
            }
            title="No messages yet. Choose a channel below and send the first message."
          />
        ) : (
          <VirtualizedMessageList
            key={contactId}
            scrollKey={contactId}
            messages={messages}
            hasMore={hasNextPage}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={() => void fetchNextPage()}
            variant="thread"
            threadContext={{
              contactName,
              contactAvatarUrl,
              businessName,
            }}
          />
        )}
      </div>

      {hasChannels ? (
        <MessageComposer
          variant="thread"
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
          channelHint={channelHint}
          subject={emailSubject}
          onSubjectChange={setEmailSubject}
          showSubject={showEmailSubject}
          recipientEmail={contactEmail}
          replyChannels={replyChannels}
          selectedReplyChannel={effectiveReplyChannel}
          onReplyChannelChange={handleReplyChannelChange}
          whatsAppRequiresTemplate={Boolean(whatsAppMode?.requiresTemplate)}
          selectedTemplateId={selectedTemplateId}
          onTemplateIdChange={handleTemplateIdChange}
          templateVariableValues={templateVariableValues}
          onTemplateVariableValueChange={handleTemplateVariableValueChange}
          templateHeaderMediaUrl={templateHeaderMediaUrl}
          onTemplateHeaderMediaUrlChange={setTemplateHeaderMediaUrl}
          onSend={() => {
            const attachments = pendingAttachment
              ? [{ type: pendingAttachment.type, url: pendingAttachment.url }]
              : undefined;
            const template = whatsAppMode?.requiresTemplate
              ? buildTemplatePayload()
              : undefined;
            sendMutation.mutate({
              text: template ? "" : composer,
              subject: showEmailSubject ? emailSubject : undefined,
              attachments: template ? undefined : attachments,
              template,
              replyChannel: activeReplyChannel,
            });
          }}
        />
      ) : null}
    </section>
  );
}
