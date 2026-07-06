"use client";

import { Plus, Search } from "lucide-react";
import { VirtualList } from "@/components/data-display/virtual-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UnifiedConversationThread } from "@/features/conversations/api/conversations.api";
import { UnifiedThreadRow } from "@/features/conversations/components/inbox/unified-thread-row";
import {
  THREAD_ROW_HEIGHT,
  VIRTUALIZE_THRESHOLD,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import { WORKSPACE_PANEL_CLASS } from "@/features/contacts/workspace/contact-workspace";
import { cn } from "@/lib/utils";

interface ConversationListPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  threads: UnifiedConversationThread[];
  listLoading: boolean;
  selectedThreadKey: string | null;
  onSelectThread: (thread: UnifiedConversationThread) => void;
  useVirtualThreads: boolean;
  onNewEmail?: () => void;
  className?: string;
}

export function ConversationListPanel({
  search,
  onSearchChange,
  threads,
  listLoading,
  selectedThreadKey,
  onSelectThread,
  useVirtualThreads,
  onNewEmail,
  className,
}: ConversationListPanelProps) {
  return (
    <aside
      className={cn(WORKSPACE_PANEL_CLASS, "h-full w-full min-w-0", className)}
    >
      <div className="border-b border-border/60 p-3">
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
          {onNewEmail ? (
            <Button
              type="button"
              size="icon"
              className="shrink-0"
              onClick={onNewEmail}
              aria-label="New email"
            >
              <Plus className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {listLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No conversations yet. Messages from connected Facebook, Instagram,
            WhatsApp, or website chat channels will appear here.
          </p>
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
