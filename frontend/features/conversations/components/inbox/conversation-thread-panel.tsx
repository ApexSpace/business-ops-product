"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { VirtualizedMessageList } from "@/features/conversations/components/virtualized-message-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignConversation,
  channelLabel,
  type Conversation,
  type ConversationMessage,
} from "@/features/conversations/api/conversations.api";
import {
  channelComposerHint,
  contactDisplayName,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import {
  MessageComposer,
  type PendingMessageAttachment,
} from "@/features/conversations/components/inbox/message-composer";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { queryKeys } from "@/lib/query/keys";

interface ConversationThreadPanelProps {
  selectedId: string | null;
  selected: Conversation | undefined;
  messages: ConversationMessage[];
  messagesLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
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
  sendMutation: UseMutationResult<
    unknown,
    Error,
    {
      id: string;
      text: string;
      subject?: string;
      attachments?: Array<{ type: string; url: string }>;
    }
  >;
  statusMutation: UseMutationResult<
    unknown,
    Error,
    { id: string; action: "close" | "reopen" }
  >;
  onAssignSuccess: () => Promise<void>;
}

export function ConversationThreadPanel({
  selectedId,
  selected,
  messages,
  messagesLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
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
  sendMutation,
  statusMutation,
  onAssignSuccess,
}: ConversationThreadPanelProps) {
  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled: Boolean(selectedId),
  });

  const assignMutation = useMutation({
    mutationFn: ({
      conversationId,
      assignedToUserId,
    }: {
      conversationId: string;
      assignedToUserId: string | null;
    }) => assignConversation(conversationId, assignedToUserId),
    onSuccess: async () => {
      toast.success("Conversation assignment updated");
      await onAssignSuccess();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assigneeItems =
    members?.items.map((member) => ({
      value: member.user.id,
      label:
        [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
        member.user.email,
    })) ?? [];

  return (
    <>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!selectedId || !selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare className="mb-3 size-10 opacity-40" />
            <p className="text-sm">Select a conversation to start.</p>
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
              <div>
                <p className="font-semibold">{contactDisplayName(selected)}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{channelLabel(selected.channel)}</Badge>
                  <span className="capitalize">{selected.status.toLowerCase()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {selected.status === "CLOSED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      statusMutation.mutate({ id: selected.id, action: "reopen" })
                    }
                  >
                    Reopen
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      statusMutation.mutate({ id: selected.id, action: "close" })
                    }
                  >
                    Close
                  </Button>
                )}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden px-2 py-2">
              {messagesLoading ? (
                <p className="px-2 text-sm text-muted-foreground">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="px-2 text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                <VirtualizedMessageList
                  messages={messages}
                  hasMore={hasNextPage}
                  isLoadingMore={isFetchingNextPage}
                  onLoadMore={() => void fetchNextPage()}
                />
              )}
            </div>

            <MessageComposer
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
                selected ? channelComposerHint(selected.channel) : null
              }
              showSubject={selected?.channel === "EMAIL"}
              subject={emailSubject}
              onSubjectChange={onEmailSubjectChange}
              isPending={sendMutation.isPending}
              onSend={() => {
                if (selectedId) {
                  sendMutation.mutate({
                    id: selectedId,
                    text: composer.trim(),
                    subject:
                      selected?.channel === "EMAIL"
                        ? emailSubject.trim() || selected.title || undefined
                        : undefined,
                    attachments: pendingAttachment ? [pendingAttachment] : undefined,
                  });
                }
              }}
            />
          </>
        )}
      </section>

      <aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col overflow-y-auto border-l border-border/80 lg:flex">
        {selected ? (
          <div className="space-y-4 p-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contact
              </p>
              <p className="mt-1 font-medium">{contactDisplayName(selected)}</p>
              {selected.contactId ? (
                <Link
                  href={`/business/contacts/${selected.contactId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Open contact
                </Link>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Channel
              </p>
              <p className="mt-1">{channelLabel(selected.channel)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <p className="mt-1 capitalize">{selected.status.toLowerCase()}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Assigned to
              </p>
              <Select
                value={selected.assignedToUserId ?? "unassigned"}
                onValueChange={(value) => {
                  assignMutation.mutate({
                    conversationId: selected.id,
                    assignedToUserId: value === "unassigned" ? null : value,
                  });
                }}
                disabled={assignMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assigneeItems.map((member) => (
                    <SelectItem key={member.value} value={member.value}>
                      {member.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">No conversation selected.</p>
        )}
      </aside>
    </>
  );
}
