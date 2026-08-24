"use client";

import { Plus } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { VirtualList } from "@/components/data-display/virtual-list";
import { SearchInput } from "@/components/forms/search-input";
import { Button } from "@/components/ui/button";
import type { UnifiedConversationThread } from "@/features/conversations/api/conversations.api";
import { UnifiedThreadRow } from "@/features/conversations/components/inbox/unified-thread-row";
import {
  THREAD_ROW_HEIGHT,
  VIRTUALIZE_THRESHOLD,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import type { InboxStatusFilter } from "@/features/conversations/hooks/use-conversations-inbox-filters";
import { WORKSPACE_PANEL_CLASS } from "@/features/contacts/workspace/contact-workspace";
import { cn } from "@/lib/utils";

const STATUS_FILTER_CHIPS: { value: InboxStatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "SPAM", label: "Spam" },
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
    <aside
      className={cn(WORKSPACE_PANEL_CLASS, "h-full w-full min-w-0", className)}
    >
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">
            Conversation
          </h2>
          {onNewConversation ? (
            <Button
              type="button"
              variant="brand"
              size="icon-sm"
              onClick={onNewConversation}
              aria-label="New conversation"
            >
              <Plus className="size-4" />
            </Button>
          ) : null}
        </div>

        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search"
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
                size="sm"
                variant={selected ? "brand" : "outline"}
                className="rounded-full"
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
                  <Plus className="mr-1.5 size-4" />
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
          <ul className="h-full divide-y divide-border overflow-auto">
            {threads.map((thread) => (
              <UnifiedThreadRow
                key={thread.threadKey}
                thread={thread}
                selectedThreadKey={selectedThreadKey}
                onSelect={onSelectThread}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export { VIRTUALIZE_THRESHOLD };
