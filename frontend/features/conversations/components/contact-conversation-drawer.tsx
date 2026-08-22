"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getContact } from "@/features/contacts/api/contacts.api";
import { useContactConversationComposer } from "@/features/contacts/hooks/use-contact-conversation-composer";
import { useRetryConversationMessage } from "@/features/conversations/hooks/use-retry-conversation-message";
import { MessageComposer } from "@/features/conversations/components/inbox/message-composer";
import { ConversationInternalNotesPanel } from "@/features/conversations/components/inbox/conversation-internal-notes-panel";
import { VirtualizedMessageList } from "@/features/conversations/components/virtualized-message-list";
import { listConversationsByContact } from "@/features/conversations/api/conversations.api";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

export interface ContactConversationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onClose?: () => void;
}

export function ContactConversationDrawer({
  open,
  onOpenChange,
  contactId,
  onClose,
}: ContactConversationDrawerProps) {
  const { apiBase, basePath } = useConversationsHost();
  const [activeTab, setActiveTab] = useState<"reply" | "note">("reply");
  const { data: business } = useCurrentBusiness();

  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: queryKeys.contacts.detail(contactId ?? ""),
    queryFn: () => getContact(contactId!),
    enabled: open && Boolean(contactId),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: queryKeys.conversations.byContact(contactId ?? "", apiBase),
    queryFn: () => listConversationsByContact(contactId!, apiBase),
    enabled: open && Boolean(contactId),
  });

  const primaryConversationId = conversations[0]?.id ?? null;
  const contactName = contact?.label ?? "Client";
  const inboxHref = contactId
    ? `${basePath}?thread=${encodeURIComponent(contactId)}`
    : basePath;

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
  } = useContactConversationComposer(contactId ?? "");

  const { retryMessage, retryingMessageId } = useRetryConversationMessage({
    contactId,
    enabled: canSend,
  });

  const showEmailSubject = effectiveReplyChannel === "EMAIL";
  const hasChannels = replyChannels.length > 0;

  const description = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <ProfileAvatar
          name={contactName}
          avatarUrl={contact?.avatarAssetId ? contact.avatarUrl : null}
          className="size-6"
          fallbackClassName="bg-primary/10 text-[10px] font-medium text-primary"
        />
        <span className="truncate font-medium text-foreground">{contactName}</span>
        <Link
          href={inboxHref}
          className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
        >
          Reopen
          <ExternalLink className="size-3" />
        </Link>
      </div>
    ),
    [contact?.avatarAssetId, contact?.avatarUrl, contactName, inboxHref],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={handleOpenChange}
      variant="sheet"
      width="conversation"
      stackLevel="overlay"
      title="Conversations"
      description={contactLoading ? "Loading…" : description}
    >
      {contactLoading || !contactId ? (
        <LoadingState label="Loading…" className="h-full min-h-[320px] py-0" />
      ) : !contact ? (
        <EmptyState
          compact
          className="h-full min-h-[320px] justify-center"
          title="Contact not found"
        />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "reply" | "note")}
          className="flex h-full min-h-0 flex-col"
        >
          <TabsList className="mb-4 grid w-full max-w-[280px] grid-cols-2">
            <TabsTrigger value="reply">Reply</TabsTrigger>
            <TabsTrigger value="note">Note</TabsTrigger>
          </TabsList>

          <TabsContent
            value="reply"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border/60"
          >
            <div className="min-h-0 flex-1 overflow-hidden bg-muted/10">
              {messagesLoading ? (
                <LoadingState
                  variant="inline"
                  label="Loading messages…"
                  className="px-4 py-3"
                />
              ) : !hasChannels ? (
                <EmptyState
                  compact
                  className="h-full min-h-[240px] justify-center px-4"
                  icon={
                    <MessageSquare
                      className="size-4 text-muted-foreground/70"
                      aria-hidden
                    />
                  }
                  title={`Add a phone number or email to ${contactName} to start messaging.`}
                />
              ) : messages.length === 0 ? (
                <EmptyState
                  compact
                  className="h-full min-h-[240px] justify-center px-4"
                  icon={
                    <MessageSquare
                      className="size-4 text-muted-foreground/70"
                      aria-hidden
                    />
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
                    contactAvatarUrl: contact.avatarAssetId
                      ? contact.avatarUrl
                      : null,
                    businessName: business?.name,
                  }}
                  onRetryMessage={retryMessage}
                  retryingMessageId={retryingMessageId}
                  canRetryMessages={canSend}
                />
              )}
            </div>

            {hasChannels ? (
              <div className="shrink-0 border-t border-border/60 bg-background">
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
                  recipientEmail={contact.email}
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
                  showCannedResponses
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
              </div>
            ) : null}
          </TabsContent>

          <TabsContent
            value="note"
            className={cn(
              "mt-0 min-h-0 flex-1 overflow-hidden rounded-[var(--radius-xl)] border border-border/60",
            )}
          >
            <ConversationInternalNotesPanel
              conversationId={primaryConversationId}
              className="h-full border-0 bg-background"
            />
          </TabsContent>
        </Tabs>
      )}
    </DrawerShell>
  );
}
