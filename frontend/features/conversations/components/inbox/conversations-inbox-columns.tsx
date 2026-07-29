"use client";

import { cn } from "@/lib/utils";
import {
  INBOX_DESKTOP_ROW_CLASS,
  INBOX_TABLET_LIST_COL_CLASS,
  INBOX_TABLET_MAIN_ROW_CLASS,
  INBOX_TABLET_THREAD_COL_CLASS,
  WORKSPACE_COLUMN_CELL_CLASS,
  WORKSPACE_GAP_CLASS,
  WORKSPACE_PADDING_CLASS,
  WORKSPACE_TABLET_SIDEBAR_COL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";

interface ConversationsInboxColumnsProps {
  list: React.ReactNode;
  thread: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
}

export function ConversationsInboxColumns({
  list,
  thread,
  sidebar,
  className,
}: ConversationsInboxColumnsProps) {
  return (
    <>
      {/* Desktop xl+: three equal-height workspace columns */}
      <div className={cn(INBOX_DESKTOP_ROW_CLASS, className)}>
        <div className={WORKSPACE_COLUMN_CELL_CLASS}>{list}</div>
        <div className={WORKSPACE_COLUMN_CELL_CLASS}>{thread}</div>
        <div className={WORKSPACE_COLUMN_CELL_CLASS}>{sidebar}</div>
      </div>

      {/* Tablet md–xl */}
      <div
        className={cn(
          "hidden min-h-0 flex-1 overflow-hidden md:flex xl:hidden",
          WORKSPACE_PADDING_CLASS,
          WORKSPACE_GAP_CLASS,
          className,
        )}
      >
        <div className={INBOX_TABLET_MAIN_ROW_CLASS}>
          <div className={INBOX_TABLET_LIST_COL_CLASS}>{list}</div>
          <div className={INBOX_TABLET_THREAD_COL_CLASS}>{thread}</div>
          <div className={WORKSPACE_TABLET_SIDEBAR_COL_CLASS}>{sidebar}</div>
        </div>
      </div>
    </>
  );
}
