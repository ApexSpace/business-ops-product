"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/relative-time";
import { MessageSquare, Search, Send } from "lucide-react";
import { IntegrationProviderIcon } from "@/components/integrations/integration-provider-icon";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  channelLabel,
  closeConversation,
  getConversation,
  getMessagingStatus,
  listConversationMessages,
  listConversations,
  markConversationRead,
  reopenConversation,
  sendConversationMessage,
  type Conversation,
  type ConversationChannel,
  type ConversationMessage,
} from "@/lib/conversations";
import { queryKeys } from "@/lib/query-keys";

type FilterKey =
  | "all"
  | "facebook"
  | "instagram"
  | "open"
  | "unread"
  | "assigned";

function channelProviderKey(channel: ConversationChannel): string {
  if (channel === "FACEBOOK") return "facebook";
  if (channel === "INSTAGRAM") return "instagram";
  return "email";
}

function contactDisplayName(conversation: Conversation): string {
  return (
    conversation.contact?.label ??
    conversation.title ??
    channelLabel(conversation.channel) + " contact"
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ConversationsInbox() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");

  const listFilters = useMemo(() => {
    const base: Record<string, string | number | undefined> = {
      page: 1,
      limit: 50,
      search: search.trim() || undefined,
    };
    if (filter === "facebook") base.channel = "FACEBOOK";
    if (filter === "instagram") base.channel = "INSTAGRAM";
    if (filter === "open") base.status = "OPEN";
    if (filter === "assigned") base.assignedToMe = "true";
    return base;
  }, [filter, search]);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: queryKeys.conversations.list(listFilters),
    queryFn: () => listConversations(listFilters),
  });

  const conversations = useMemo(() => {
    const items = listData?.items ?? [];
    if (filter === "unread") {
      return items.filter((c) => c.unreadCount > 0);
    }
    return items;
  }, [listData?.items, filter]);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const { data: selected } = useQuery({
    queryKey: queryKeys.conversations.detail(selectedId ?? ""),
    queryFn: () => getConversation(selectedId!),
    enabled: Boolean(selectedId),
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: queryKeys.conversations.messages(selectedId ?? "", 1),
    queryFn: () => listConversationMessages(selectedId!, 1, 100),
    enabled: Boolean(selectedId),
  });

  const messagingStatusQuery = useQuery({
    queryKey: queryKeys.integrations.messagingStatus(
      selected?.providerKey ?? "",
    ),
    queryFn: () => getMessagingStatus(selected!.providerKey),
    enabled: Boolean(selected?.providerKey),
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all() });
  };

  const sendMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      sendConversationMessage(id, text),
    onSuccess: async () => {
      setComposer("");
      await invalidateAll();
      if (selectedId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages(selectedId, 1),
        });
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markConversationRead(id),
    onSuccess: invalidateAll,
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "close" | "reopen";
    }) => (action === "close" ? closeConversation(id) : reopenConversation(id)),
    onSuccess: invalidateAll,
  });

  useEffect(() => {
    if (selectedId && selected && selected.unreadCount > 0) {
      markReadMutation.mutate(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.unreadCount]);

  const canSend =
    Boolean(selectedId) &&
    composer.trim().length > 0 &&
    (messagingStatusQuery.data?.readyForMessaging ?? false);

  const sendDisabledReason = !messagingStatusQuery.data?.readyForMessaging
    ? selected?.providerKey === "facebook"
      ? "Select a Facebook Page and complete messaging setup before sending."
      : selected?.providerKey === "instagram"
        ? "Select an Instagram account and complete messaging setup before sending."
        : "Messaging is not ready for this channel."
    : null;

  const messages = messagesData?.items ?? [];

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[520px] overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <aside className="flex w-full max-w-sm flex-col border-r border-border/80">
        <div className="space-y-3 border-b border-border/80 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "All"],
                ["facebook", "Facebook"],
                ["instagram", "Instagram"],
                ["open", "Open"],
                ["unread", "Unread"],
                ["assigned", "Mine"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {listLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No conversations yet. Messages from connected Facebook or
              Instagram channels will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {conversations.map((conversation) => {
                const name = contactDisplayName(conversation);
                const active = conversation.id === selectedId;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={cn(
                        "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                        active && "bg-muted/60",
                      )}
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage
                          src={conversation.contact?.avatarUrl ?? undefined}
                        />
                        <AvatarFallback>{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {name}
                          </span>
                          {conversation.lastMessageAt ? (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatRelativeTime(conversation.lastMessageAt)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <IntegrationProviderIcon
                            providerKey={channelProviderKey(conversation.channel)}
                            size="sm"
                            className="!size-4 shrink-0"
                          />
                          <span className="truncate text-xs text-muted-foreground">
                            {conversation.lastMessagePreview ?? "No messages"}
                          </span>
                        </div>
                      </div>
                      {conversation.unreadCount > 0 ? (
                        <Badge className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                          {conversation.unreadCount}
                        </Badge>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </aside>

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

            <ScrollArea className="flex-1 px-4 py-4">
              {messagesLoading ? (
                <p className="text-sm text-muted-foreground">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              )}
            </ScrollArea>

            <footer className="border-t border-border/80 p-3">
              {sendDisabledReason ? (
                <p className="mb-2 text-xs text-muted-foreground">
                  {sendDisabledReason}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Type a message…"
                  rows={2}
                  className="min-h-[60px] resize-none"
                  disabled={!canSend && Boolean(sendDisabledReason)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend && selectedId) {
                        sendMutation.mutate({
                          id: selectedId,
                          text: composer.trim(),
                        });
                      }
                    }
                  }}
                />
                <Button
                  className="shrink-0 self-end"
                  disabled={!canSend || sendMutation.isPending}
                  onClick={() => {
                    if (selectedId) {
                      sendMutation.mutate({
                        id: selectedId,
                        text: composer.trim(),
                      });
                    }
                  }}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </footer>
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
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const outbound = message.direction === "OUTBOUND";
  const failed = message.status === "FAILED";

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          outbound
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
          failed && "border border-destructive/50 bg-destructive/10 text-destructive",
        )}
      >
        <p>{message.text ?? "[Attachment]"}</p>
        <p
          className={cn(
            "mt-1 text-[10px] opacity-70",
            outbound ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {formatRelativeTime(message.createdAt)}
          {failed ? " · Failed to send" : null}
        </p>
      </div>
    </div>
  );
}
