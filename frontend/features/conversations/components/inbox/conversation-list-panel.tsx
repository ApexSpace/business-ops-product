"use client";

import { Plus, Search } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { VirtualList } from "@/components/data-display/virtual-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { UnifiedConversationThread } from "@/features/conversations/api/conversations.api";
import { UnifiedThreadRow } from "@/features/conversations/components/inbox/unified-thread-row";
import {
  THREAD_ROW_HEIGHT,
  VIRTUALIZE_THRESHOLD,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import type { InboxStatusFilter } from "@/features/conversations/hooks/use-conversations-inbox-filters";
import { WORKSPACE_PANEL_CLASS } from "@/features/contacts/workspace/contact-workspace";
import { cn } from "@/lib/utils";

const STATUS_FILTER_LABELS: Record<InboxStatusFilter, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  SPAM: "Spam",
};

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
      <div className="border-b border-border/60 p-3">
        <div className="mb-2">
          <Select
            value={statusFilter}
            onValueChange={(next) =>
              onStatusFilterChange(next as InboxStatusFilter)
            }
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-full border-border/60 bg-muted/20 text-xs shadow-none"
              aria-label="Filter conversations by status"
            >
              <span className="min-w-0 flex-1 truncate text-left">
                {STATUS_FILTER_LABELS[statusFilter]}
              </span>
            </SelectTrigger>
            <SelectContent align="start">
              {(Object.keys(STATUS_FILTER_LABELS) as InboxStatusFilter[]).map(
                (value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_FILTER_LABELS[value]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations…"
              className="pl-8"
            />
          </div>
          {onNewConversation ? (
            <Button
              type="button"
              size="icon"
              className="shrink-0"
              onClick={onNewConversation}
              aria-label="New conversation"
            >
              <Plus className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {listError ? (
          <div className="p-3">
            <ApiErrorState
              compact
              error={listError}
              onRetry={onListRetry}
            />
          </div>
        ) : listLoading ? (
          <LoadingState
            variant="inline"
            label="Loading…"
            className="p-4"
          />
        ) : threads.length === 0 ? (
          <EmptyState
            compact
            title="No conversations yet"
            description="Messages from connected Facebook, Instagram, WhatsApp, or website chat channels will appear here."
            className="px-3 py-8"
            action={
              onNewConversation ? (
                <Button size="sm" onClick={onNewConversation}>
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
          <ul className="divide-y divide-border/60 overflow-auto h-full">
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
