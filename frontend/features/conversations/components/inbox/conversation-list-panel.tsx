"use client";

import { Search } from "lucide-react";
import { VirtualList } from "@/components/data-display/virtual-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Conversation } from "@/features/conversations/api/conversations.api";
import { ConversationThreadRow } from "@/features/conversations/components/inbox/conversation-thread-row";
import {
  THREAD_ROW_HEIGHT,
  VIRTUALIZE_THRESHOLD,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";

type InboxFilter =
  | "all"
  | "facebook"
  | "instagram"
  | "webchat"
  | "open"
  | "unread"
  | "assigned";

interface ConversationListPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  conversations: Conversation[];
  listLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  useVirtualThreads: boolean;
}

export function ConversationListPanel({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  conversations,
  listLoading,
  selectedId,
  onSelect,
  useVirtualThreads,
}: ConversationListPanelProps) {
  return (
    <aside className="flex w-full max-w-sm flex-col border-r border-border/80">
      <div className="space-y-3 border-b border-border/80 p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
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
              ["webchat", "Website Chat"],
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
              onClick={() => onFilterChange(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {listLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No conversations yet. Messages from connected Facebook or Instagram
            channels will appear here.
          </p>
        ) : useVirtualThreads ? (
          <VirtualList
            className="h-full"
            items={conversations}
            estimateSize={THREAD_ROW_HEIGHT}
            getKey={(c) => c.id}
            renderItem={(conversation) => (
              <ConversationThreadRow
                conversation={conversation}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}
          />
        ) : (
          <ul className="divide-y divide-border/60 overflow-auto h-full">
            {conversations.map((conversation) => (
              <ConversationThreadRow
                key={conversation.id}
                conversation={conversation}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export { VIRTUALIZE_THRESHOLD };
