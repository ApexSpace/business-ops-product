"use client";

import { cn } from "@/lib/utils";
import {
  WORKSPACE_COLUMN_CELL_CLASS,
  WORKSPACE_DESKTOP_ROW_CLASS,
  WORKSPACE_GAP_CLASS,
  WORKSPACE_PADDING_CLASS,
  WORKSPACE_TABLET_CONVERSATION_COL_CLASS,
  WORKSPACE_TABLET_MAIN_ROW_CLASS,
  WORKSPACE_TABLET_RAIL_COL_CLASS,
  WORKSPACE_TABLET_SIDEBAR_COL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";

interface ContactWorkspaceColumnsProps {
  conversation: React.ReactNode;
  sidebar: React.ReactNode;
  rail?: React.ReactNode;
  className?: string;
}

export function ContactWorkspaceColumns({
  conversation,
  sidebar,
  rail,
  className,
}: ContactWorkspaceColumnsProps) {
  return (
    <>
      {/* Desktop xl+: conversation (left, wide) + sidebar + rail */}
      <div className={cn(WORKSPACE_DESKTOP_ROW_CLASS, className)}>
        <div className={WORKSPACE_COLUMN_CELL_CLASS}>{conversation}</div>
        <div className={WORKSPACE_COLUMN_CELL_CLASS}>{sidebar}</div>
        {rail ? (
          <div className={WORKSPACE_COLUMN_CELL_CLASS}>{rail}</div>
        ) : null}
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
        <div className={WORKSPACE_TABLET_MAIN_ROW_CLASS}>
          <div className={WORKSPACE_TABLET_CONVERSATION_COL_CLASS}>
            {conversation}
          </div>
          <div className={WORKSPACE_TABLET_SIDEBAR_COL_CLASS}>{sidebar}</div>
          {rail ? (
            <div className={WORKSPACE_TABLET_RAIL_COL_CLASS}>{rail}</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
