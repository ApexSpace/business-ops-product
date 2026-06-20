"use client";

import { useState } from "react";
import { ImagePlus, Info, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReplyChannelSelector } from "@/features/conversations/components/inbox/reply-channel-selector";
import { WhatsAppTemplateComposer } from "@/features/conversations/components/inbox/whatsapp-template-composer";
import type {
  ContactReplyChannel,
  ConversationChannel,
} from "@/features/conversations/api/conversations.api";
import { cn } from "@/lib/utils";
import { CannedResponsesPicker } from "@/features/conversations/components/inbox/canned-responses-picker";

export interface PendingMessageAttachment {
  type: string;
  url: string;
}

interface MessageComposerProps {
  composer: string;
  onComposerChange: (value: string) => void;
  attachmentUrl: string;
  onAttachmentUrlChange: (value: string) => void;
  pendingAttachment: PendingMessageAttachment | null;
  onAddAttachment: () => void;
  onRemoveAttachment: () => void;
  canSend: boolean;
  sendDisabledReason: string | null;
  channelHint?: string | null;
  subject?: string;
  onSubjectChange?: (value: string) => void;
  showSubject?: boolean;
  recipientEmail?: string | null;
  replyChannels?: ContactReplyChannel[];
  selectedReplyChannel?: ConversationChannel | null;
  onReplyChannelChange?: (channel: ConversationChannel) => void;
  hideReplyChannelSelector?: boolean;
  whatsAppRequiresTemplate?: boolean;
  selectedTemplateId?: string | null;
  onTemplateIdChange?: (templateId: string | null) => void;
  templateVariableValues?: Record<string, string>;
  onTemplateVariableValueChange?: (key: string, value: string) => void;
  templateHeaderMediaUrl?: string;
  onTemplateHeaderMediaUrlChange?: (value: string) => void;
  onSend: () => void;
  variant?: "default" | "thread";
  showCannedResponses?: boolean;
}

function ComposerStatusBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 border-b border-border/50 bg-muted/30 px-3 py-2"
      role="status"
    >
      <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
      <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

function ComposerInputCard({
  statusMessage,
  children,
  className,
  layout = "row",
}: {
  statusMessage?: string | null;
  children: React.ReactNode;
  className?: string;
  layout?: "row" | "stack";
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm",
        className,
      )}
    >
      {statusMessage ? <ComposerStatusBanner message={statusMessage} /> : null}
      <div
        className={cn(
          layout === "row"
            ? "flex min-w-0 items-center gap-2 px-2 py-1.5"
            : "flex min-w-0 flex-col",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ComposerFieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-border/40 px-3 py-1.5">
      <span className="w-12 shrink-0 text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const borderlessFieldClass =
  "h-8 min-h-8 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0";

export function MessageComposer({
  composer,
  onComposerChange,
  attachmentUrl,
  onAttachmentUrlChange,
  pendingAttachment,
  onAddAttachment,
  onRemoveAttachment,
  canSend,
  sendDisabledReason,
  channelHint,
  subject,
  onSubjectChange,
  showSubject = false,
  recipientEmail,
  replyChannels,
  selectedReplyChannel,
  onReplyChannelChange,
  hideReplyChannelSelector = false,
  whatsAppRequiresTemplate = false,
  selectedTemplateId = null,
  onTemplateIdChange,
  templateVariableValues = {},
  onTemplateVariableValueChange,
  templateHeaderMediaUrl = "",
  onTemplateHeaderMediaUrlChange,
  onSend,
  variant = "default",
  showCannedResponses = false,
}: MessageComposerProps) {
  const [attachmentOpen, setAttachmentOpen] = useState(false);

  const composerDisabled =
    !canSend && Boolean(sendDisabledReason) && !whatsAppRequiresTemplate;
  const isEmailComposer = showSubject && selectedReplyChannel === "EMAIL";
  const showReplyChannelSelector =
    !hideReplyChannelSelector &&
    replyChannels &&
    replyChannels.length > 0 &&
    onReplyChannelChange;
  const inlineStatusHint = sendDisabledReason ?? channelHint;

  const showWhatsAppTemplateComposer =
    whatsAppRequiresTemplate &&
    selectedReplyChannel === "WHATSAPP" &&
    onTemplateIdChange &&
    onTemplateVariableValueChange &&
    onTemplateHeaderMediaUrlChange;

  const messageInput = (
    <Input
      value={composer}
      onChange={(e) => onComposerChange(e.target.value)}
      placeholder="Type a message…"
      className={
        variant === "thread"
          ? "h-9 min-h-9 min-w-0 flex-1 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-0"
          : "h-9 min-h-9 min-w-0 flex-1 border-0 bg-transparent px-2 py-0 text-sm shadow-none focus-visible:ring-0"
      }
      disabled={composerDisabled}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (canSend) onSend();
        }
      }}
    />
  );

  const emailBodyInput = (
    <Textarea
      value={composer}
      onChange={(e) => onComposerChange(e.target.value)}
      placeholder="Write your email…"
      rows={2}
      disabled={composerDisabled}
      className="min-h-[3.25rem] max-h-28 resize-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (canSend) onSend();
        }
      }}
    />
  );

  const sendButton = (
    <Button
      type="button"
      size="icon"
      className="size-9 shrink-0 rounded-full"
      disabled={!canSend}
      onClick={onSend}
      aria-label={showWhatsAppTemplateComposer ? "Send template" : "Send message"}
    >
      <Send className="size-4" />
    </Button>
  );

  const attachmentToggle = (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn(
        "size-8 shrink-0 rounded-md text-muted-foreground",
        attachmentOpen && "bg-muted/60 text-foreground",
      )}
      disabled={composerDisabled}
      onClick={() => setAttachmentOpen((open) => !open)}
      aria-label="Add attachment"
      aria-pressed={attachmentOpen}
    >
      <Paperclip className="size-4" />
    </Button>
  );

  const pendingAttachmentChip = pendingAttachment ? (
    <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-muted/15 px-3 py-2 text-xs">
      <span className="min-w-0 truncate text-muted-foreground">
        Attached: {pendingAttachment.url}
      </span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
        onClick={onRemoveAttachment}
        aria-label="Remove attachment"
      >
        <X className="size-4" />
      </Button>
    </div>
  ) : null;

  const attachmentUrlRow =
    attachmentOpen && !pendingAttachment ? (
      <div className="flex items-center gap-2 border-t border-border/40 px-3 py-2">
        <Input
          value={attachmentUrl ?? ""}
          onChange={(e) => onAttachmentUrlChange(e.target.value)}
          placeholder="Paste attachment URL…"
          className="h-8 min-w-0 flex-1 text-xs"
          disabled={composerDisabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-2.5 text-xs"
          disabled={!(attachmentUrl ?? "").trim() || composerDisabled}
          onClick={() => {
            onAddAttachment();
            setAttachmentOpen(false);
          }}
        >
          Add
        </Button>
      </div>
    ) : null;

  const emailThreadComposer = (
    <ComposerInputCard statusMessage={inlineStatusHint} layout="stack">
      {recipientEmail ? (
        <ComposerFieldRow label="To">
          <span className="truncate text-xs text-foreground/90">{recipientEmail}</span>
        </ComposerFieldRow>
      ) : null}
      <ComposerFieldRow label="Subject">
        <Input
          value={subject ?? ""}
          onChange={(e) => onSubjectChange?.(e.target.value)}
          placeholder="Subject"
          className={borderlessFieldClass}
          disabled={composerDisabled}
        />
      </ComposerFieldRow>
      <div className="flex items-start gap-2 px-2 py-2">
        {attachmentToggle}
        <div className="min-w-0 flex-1">{emailBodyInput}</div>
        {sendButton}
      </div>
      {attachmentUrlRow}
      {pendingAttachmentChip}
    </ComposerInputCard>
  );

  const threadComposeRow = (
    <ComposerInputCard statusMessage={inlineStatusHint}>
      {showReplyChannelSelector ? (
        <ReplyChannelSelector
          channels={replyChannels}
          value={selectedReplyChannel ?? null}
          onChange={onReplyChannelChange}
          variant="compact"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        {showWhatsAppTemplateComposer ? (
          <WhatsAppTemplateComposer
            selectedTemplateId={selectedTemplateId}
            onTemplateIdChange={onTemplateIdChange}
            variableValues={templateVariableValues}
            onVariableValueChange={onTemplateVariableValueChange}
            headerMediaUrl={templateHeaderMediaUrl}
            onHeaderMediaUrlChange={onTemplateHeaderMediaUrlChange}
            disabled={!canSend && Boolean(sendDisabledReason)}
            variant="inline"
          />
        ) : (
          messageInput
        )}
      </div>
      {showCannedResponses ? (
        <CannedResponsesPicker
          onSelect={(text) =>
            onComposerChange(composer.trim() ? `${composer}\n${text}` : text)
          }
        />
      ) : null}
      {sendButton}
    </ComposerInputCard>
  );

  const defaultAttachmentSection =
    variant === "default" && !showWhatsAppTemplateComposer ? (
      pendingAttachment ? (
        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
          <span className="truncate">
            Image attached: {pendingAttachment.url}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            onClick={onRemoveAttachment}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={attachmentUrl ?? ""}
            onChange={(e) => onAttachmentUrlChange(e.target.value)}
            placeholder="Paste public image URL to attach…"
            className="h-9 min-w-0 flex-1 text-sm"
            disabled={composerDisabled}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            disabled={!(attachmentUrl ?? "").trim() || composerDisabled}
            onClick={onAddAttachment}
            aria-label="Attach image"
          >
            <ImagePlus className="size-4" />
          </Button>
        </div>
      )
    ) : null;

  if (variant === "thread") {
    return (
      <footer className="shrink-0 border-t border-border/60 bg-background px-3 py-2.5">
        {isEmailComposer ? emailThreadComposer : threadComposeRow}
        {showWhatsAppTemplateComposer ? (
          <div className="mt-2">
            <WhatsAppTemplateComposer
              selectedTemplateId={selectedTemplateId}
              onTemplateIdChange={onTemplateIdChange}
              variableValues={templateVariableValues}
              onVariableValueChange={onTemplateVariableValueChange}
              headerMediaUrl={templateHeaderMediaUrl}
              onHeaderMediaUrlChange={onTemplateHeaderMediaUrlChange}
              disabled={!canSend && Boolean(sendDisabledReason)}
              variant="extras"
            />
          </div>
        ) : null}
      </footer>
    );
  }

  const composerBody = showWhatsAppTemplateComposer ? (
    <WhatsAppTemplateComposer
      selectedTemplateId={selectedTemplateId}
      onTemplateIdChange={onTemplateIdChange}
      variableValues={templateVariableValues}
      onVariableValueChange={onTemplateVariableValueChange}
      headerMediaUrl={templateHeaderMediaUrl}
      onHeaderMediaUrlChange={onTemplateHeaderMediaUrlChange}
      disabled={!canSend && Boolean(sendDisabledReason)}
      variant="default"
    />
  ) : isEmailComposer ? (
    emailBodyInput
  ) : (
    messageInput
  );

  if (isEmailComposer) {
    return (
      <footer className="shrink-0 border-t border-border/80 bg-card p-3">
        {emailThreadComposer}
      </footer>
    );
  }

  return (
    <footer className="shrink-0 border-t border-border/80 bg-card p-3">
      {showWhatsAppTemplateComposer ? (
        <div className="space-y-2">
          <ComposerInputCard statusMessage={inlineStatusHint}>
            <WhatsAppTemplateComposer
              selectedTemplateId={selectedTemplateId}
              onTemplateIdChange={onTemplateIdChange}
              variableValues={templateVariableValues}
              onVariableValueChange={onTemplateVariableValueChange}
              headerMediaUrl={templateHeaderMediaUrl}
              onHeaderMediaUrlChange={onTemplateHeaderMediaUrlChange}
              disabled={!canSend && Boolean(sendDisabledReason)}
              variant="inline"
            />
            {sendButton}
          </ComposerInputCard>
          <WhatsAppTemplateComposer
            selectedTemplateId={selectedTemplateId}
            onTemplateIdChange={onTemplateIdChange}
            variableValues={templateVariableValues}
            onVariableValueChange={onTemplateVariableValueChange}
            headerMediaUrl={templateHeaderMediaUrl}
            onHeaderMediaUrlChange={onTemplateHeaderMediaUrlChange}
            disabled={!canSend && Boolean(sendDisabledReason)}
            variant="extras"
          />
        </div>
      ) : (
        <div className="space-y-2">
          {defaultAttachmentSection}
          <ComposerInputCard statusMessage={inlineStatusHint}>
            {showReplyChannelSelector ? (
              <ReplyChannelSelector
                channels={replyChannels}
                value={selectedReplyChannel ?? null}
                onChange={onReplyChannelChange}
                variant="compact"
              />
            ) : null}
            {composerBody}
            {showCannedResponses ? (
              <CannedResponsesPicker
                onSelect={(text) =>
                  onComposerChange(composer.trim() ? `${composer}\n${text}` : text)
                }
              />
            ) : null}
            {sendButton}
          </ComposerInputCard>
        </div>
      )}
    </footer>
  );
}
