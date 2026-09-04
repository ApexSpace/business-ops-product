"use client";

import { LoadingState } from "@/components/data-display/loading-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { DrawerAddAction } from "@/components/drawer/drawer-add-action";
import { SearchInput } from "@/components/forms/search-input";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BusinessMember } from "@/features/settings/types";
import {
  WORKSPACE_NAV_ITEM_ACTIVE_CLASS,
  WORKSPACE_NAV_ITEM_CLASS,
  WORKSPACE_NAV_ITEM_IDLE_CLASS,
  WORKSPACE_NAV_PANEL_CLASS,
  WORKSPACE_NAV_SCROLL_AREA_CLASS,
  WORKSPACE_NAV_SCROLL_INNER_CLASS,
  WORKSPACE_NAV_SEARCH_WRAP_CLASS,
} from "@/lib/design/workspace-nav-tokens";
import { cn } from "@/lib/utils";

export function memberDisplayName(member: BusinessMember): string {
  const name = [member.user.firstName, member.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name || member.user.email;
}

type TeamSidebarProps = {
  members: BusinessMember[];
  selectedUserId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (userId: string) => void;
  onAdd: () => void;
  canManage: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
};

export function TeamSidebar({
  members,
  selectedUserId,
  search,
  onSearchChange,
  onSelect,
  onAdd,
  canManage,
  isLoading,
  isError,
  errorMessage,
}: TeamSidebarProps) {
  return (
    <aside className={cn(WORKSPACE_NAV_PANEL_CLASS, "w-64 shrink-0 border-r")}>
      <div className={WORKSPACE_NAV_SEARCH_WRAP_CLASS}>
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search staff…"
        />
      </div>

      <ScrollArea className={WORKSPACE_NAV_SCROLL_AREA_CLASS}>
        <div className={cn(WORKSPACE_NAV_SCROLL_INNER_CLASS, "space-y-1")}>
          {canManage ? (
            <DrawerAddAction
              label="Add Staff Member"
              size="sidebar"
              onClick={onAdd}
              className="mb-2"
            />
          ) : null}

          {isLoading ? (
            <LoadingState
              variant="inline"
              label="Loading staff…"
              className="py-4"
            />
          ) : isError ? (
            <p className="py-4 text-sm text-destructive">
              {errorMessage ?? "Could not load staff members."}
            </p>
          ) : members.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              {search.trim()
                ? "No staff match your search."
                : "No staff members yet."}
            </p>
          ) : (
            members.map((member) => {
              const selected = member.userId === selectedUserId;
              const label = memberDisplayName(member);
              return (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => onSelect(member.userId)}
                  className={cn(
                    WORKSPACE_NAV_ITEM_CLASS,
                    "h-auto min-h-[var(--workspace-nav-item-height)] py-2",
                    selected
                      ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
                      : WORKSPACE_NAV_ITEM_IDLE_CLASS,
                  )}
                >
                  <ProfileAvatar name={label} size="sm" className="size-8" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <StatusBadge
                        status={member.status}
                        domain="membership"
                        className="text-[10px]"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {member.role === "ADMIN" || member.role === "OWNER"
                          ? "Admin"
                          : "Normal"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
