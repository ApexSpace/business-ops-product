"use client";

import { cn } from "@/lib/utils";
import {
  WORKSPACE_COLUMN_CELL_CLASS,
  WORKSPACE_DESKTOP_ROW_CLASS,
  WORKSPACE_GAP_CLASS,
  WORKSPACE_PADDING_CLASS,
  WORKSPACE_TABLET_BOTTOM_ROW_CLASS,
  WORKSPACE_TABLET_CONVERSATION_COL_CLASS,
  WORKSPACE_TABLET_DETAILS_COL_CLASS,
  WORKSPACE_TABLET_MAIN_ROW_CLASS,
  WORKSPACE_TABLET_RAIL_COL_CLASS,
  WORKSPACE_TABLET_RECORDS_COL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";

interface ContactWorkspaceColumnsProps {
  details: React.ReactNode;
  conversation: React.ReactNode;
  records: React.ReactNode;
  rail?: React.ReactNode;
  tabletRecords?: React.ReactNode;
  className?: string;
}

export function ContactWorkspaceColumns({
  details,
  conversation,
  records,
  rail,
  tabletRecords,
  className,
}: ContactWorkspaceColumnsProps) {
  return (
    <>
      {/* Desktop xl+: fixed side columns + flexible center */}
      <div className={cn(WORKSPACE_DESKTOP_ROW_CLASS, className)}>
        <div className={WORKSPACE_COLUMN_CELL_CLASS}>{details}</div>
        <div className={WORKSPACE_COLUMN_CELL_CLASS}>{conversation}</div>
        <div className={WORKSPACE_COLUMN_CELL_CLASS}>{records}</div>
        {rail ? (
          <div className={WORKSPACE_COLUMN_CELL_CLASS}>{rail}</div>
        ) : null}
      </div>

      {/* Tablet md–xl (avoids crushed columns on 1024–1279px) */}
      <div
        className={cn(
          "hidden min-h-0 flex-1 flex-col overflow-hidden md:flex xl:hidden",
          WORKSPACE_PADDING_CLASS,
          WORKSPACE_GAP_CLASS,
          "gap-y-1.5 sm:gap-y-2",
          className,
        )}
      >
        <div className={WORKSPACE_TABLET_MAIN_ROW_CLASS}>
          <div className={WORKSPACE_TABLET_DETAILS_COL_CLASS}>{details}</div>
          <div className={WORKSPACE_TABLET_CONVERSATION_COL_CLASS}>
            {conversation}
          </div>
        </div>
        <div className={WORKSPACE_TABLET_BOTTOM_ROW_CLASS}>
          <div className={WORKSPACE_TABLET_RECORDS_COL_CLASS}>
            {tabletRecords ?? records}
          </div>
          {rail ? (
            <div className={WORKSPACE_TABLET_RAIL_COL_CLASS}>{rail}</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
