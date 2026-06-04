"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { VirtualizedMessageList } from "@/features/conversations/components/virtualized-message-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  channelLabel,
  type Conversation,
  type ConversationMessage,
} from "@/features/conversations/api/conversations.api";
import { contactDisplayName } from "@/features/conversations/components/inbox/conversation-inbox-utils";
import { MessageComposer } from "@/features/conversations/components/inbox/message-composer";

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
  canSend: boolean;
  sendDisabledReason: string | null;
  sendMutation: UseMutationResult<unknown, Error, { id: string; text: string }>;
  statusMutation: UseMutationResult<
    unknown,
    Error,
    { id: string; action: "close" | "reopen" }
  >;
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
  canSend,
  sendDisabledReason,
  sendMutation,
  statusMutation,
}: ConversationThreadPanelProps) {
  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col">
        {!selectedId || !selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare className="mb-3 size-10 opacity-40" />
            <p className="text-sm">Select a conversation to start.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
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

            <div className="flex-1 px-2 py-2">
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
              canSend={canSend}
              sendDisabledReason={sendDisabledReason}
              isPending={sendMutation.isPending}
              onSend={() => {
                if (selectedId) {
                  sendMutation.mutate({ id: selectedId, text: composer.trim() });
                }
              }}
            />
          </>
        )}
      </section>

      <aside className="hidden w-72 shrink-0 flex-col border-l border-border/80 lg:flex">
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
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">No conversation selected.</p>
        )}
      </aside>
    </>
  );
}
