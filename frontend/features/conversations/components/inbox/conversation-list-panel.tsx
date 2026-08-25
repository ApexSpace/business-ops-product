"use client";

import { SquarePen } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { VirtualList } from "@/components/data-display/virtual-list";
import { SearchInput } from "@/components/forms/search-input";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import type { UnifiedConversationThread } from "@/features/conversations/api/conversations.api";
import { UnifiedThreadRow } from "@/features/conversations/components/inbox/unified-thread-row";
import {
  THREAD_ROW_HEIGHT,
  VIRTUALIZE_THRESHOLD,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import type { InboxStatusFilter } from "@/features/conversations/hooks/use-conversations-inbox-filters";
import { INBOX_LIST_PANEL_CLASS } from "@/features/contacts/workspace/contact-workspace";
import { cn } from "@/lib/utils";

const STATUS_FILTER_CHIPS: { value: InboxStatusFilter; label: string }[] = [
  { value: "ALL", label: "ALL" },
  { value: "OPEN", label: "OPEN" },
  { value: "CLOSED", label: "CLOSED" },
  { value: "SPAM", label: "SPAM" },
];

interface ConversationListPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: InboxStatusFilter;
  onStatusFilterChange: (value: InboxStatusFilter) => void;
  threads: UnifiedConversationThread[];
  listLoading: boolean;
  listError?: unknown;
  onListRetry?: () => void;
  selectedThreadKey: string | null;
  onSelectThread: (thread: UnifiedConversationThread) => void;
  useVirtualThreads: boolean;
  onNewConversation?: () => void;
  className?: string;
}

export function ConversationListPanel({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  threads,
  listLoading,
  listError,
  onListRetry,
  selectedThreadKey,
  onSelectThread,
  useVirtualThreads,
  onNewConversation,
  className,
}: ConversationListPanelProps) {
  return (
    <aside className={cn(INBOX_LIST_PANEL_CLASS, className)}>
      <div className="flex shrink-0 flex-col gap-4 border-b border-border px-6 py-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-heading-5 font-bold tracking-tight text-violet-primary-dark">
            Conversation
          </h2>
          {onNewConversation ? (
            <IconButton
              variant="ghost"
              size="icon-sm"
              onClick={onNewConversation}
              aria-label="New conversation"
            >
              <SquarePen className="size-4" />
            </IconButton>
          ) : null}
        </div>

        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search clients..."
          className="max-w-none"
        />

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter conversations by status"
        >
          {STATUS_FILTER_CHIPS.map((chip) => {
            const selected = statusFilter === chip.value;
            return (
              <Button
                key={chip.value}
                type="button"
                size="xs"
                variant={selected ? "brand" : "outline"}
                className="rounded-full px-3 uppercase tracking-wide"
                aria-pressed={selected}
                onClick={() => onStatusFilterChange(chip.value)}
              >
                {chip.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {listError ? (
          <div className="p-3">
            <ApiErrorState compact error={listError} onRetry={onListRetry} />
          </div>
        ) : listLoading ? (
          <LoadingState variant="inline" label="Loading…" className="p-4" />
        ) : threads.length === 0 ? (
          <EmptyState
            compact
            title="No conversations yet"
            description="Messages from connected Facebook, Instagram, WhatsApp, or website chat channels will appear here."
            className="px-3 py-8"
            action={
              onNewConversation ? (
                <Button variant="brand" size="sm" onClick={onNewConversation}>
                  New conversation
                </Button>
              ) : undefined
            }
          />
        ) : useVirtualThreads ? (
          <VirtualList
            className="h-full"
            items={threads}
            estimateSize={THREAD_ROW_HEIGHT}
            getKey={(thread) => thread.threadKey}
            renderItem={(thread) => (
              <UnifiedThreadRow
                thread={thread}
                selectedThreadKey={selectedThreadKey}
                onSelect={onSelectThread}
              />
            )}
          />
        ) : (
          <div className="h-full overflow-auto">
            {threads.map((thread) => (
              <UnifiedThreadRow
                key={thread.threadKey}
                thread={thread}
                selectedThreadKey={selectedThreadKey}
                onSelect={onSelectThread}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export { VIRTUALIZE_THRESHOLD };
