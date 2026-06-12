"use client";

import Link from "next/link";
import { ExternalLink, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageComposer } from "@/features/conversations/components/inbox/message-composer";
import { VirtualizedMessageList } from "@/features/conversations/components/virtualized-message-list";
import { useContactConversationComposer } from "@/features/contacts/hooks/use-contact-conversation-composer";
import { cn } from "@/lib/utils";

const CONTACT_CONVERSATION_PANEL_CLASS =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-elevation-xs";

interface ContactConversationPanelProps {
  contactId: string;
  contactName: string;
  contactAvatarUrl?: string | null;
  businessName?: string | null;
  className?: string;
}

export function ContactConversationPanel({
  contactId,
  contactName,
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
  } = useContactConversationComposer(contactId);

  const inboxHref = `/business/conversations?thread=${encodeURIComponent(contactId)}`;
  const showEmailSubject = effectiveReplyChannel === "EMAIL";
  const hasChannels = replyChannels.length > 0;

  return (
    <section className={cn(CONTACT_CONVERSATION_PANEL_CLASS, className)}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10 shrink-0">
            {contactAvatarUrl ? (
              <AvatarImage src={contactAvatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {contactName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
          <p className="px-4 py-3 text-sm text-muted-foreground">Loading messages…</p>
        ) : !hasChannels ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <MessageSquare className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Add a phone number or email to {contactName} to start messaging.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <MessageSquare className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Choose a channel below and send the first message.
            </p>
          </div>
        ) : (
          <VirtualizedMessageList
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
          replyChannels={replyChannels}
          selectedReplyChannel={effectiveReplyChannel}
          onReplyChannelChange={handleReplyChannelChange}
          onSend={() => {
            const attachments = pendingAttachment
              ? [{ type: pendingAttachment.type, url: pendingAttachment.url }]
              : undefined;
            sendMutation.mutate({
              text: composer,
              subject: showEmailSubject ? emailSubject : undefined,
              attachments,
              replyChannel: activeReplyChannel,
            });
          }}
        />
      ) : null}
    </section>
  );
}
