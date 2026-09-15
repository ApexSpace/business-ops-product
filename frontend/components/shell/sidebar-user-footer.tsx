"use client";

import { UserMenu } from "./user-menu";

export function SidebarUserFooter() {
  return (
    <div className="border-t border-transparent px-3 py-3 group-data-[collapsible=icon]:px-2">
      <UserMenu variant="sidebar" />
    </div>
  );
}
