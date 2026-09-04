"use client";

import { LoadingState } from "@/components/data-display/loading-state";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/forms/search-input";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BusinessMember } from "@/features/settings/types";
import {
  WORKSPACE_NAV_ITEM_ACTIVE_CLASS,
  WORKSPACE_NAV_ITEM_IDLE_CLASS,
  WORKSPACE_NAV_ASIDE_CLASS,
  WORKSPACE_NAV_PERSON_ITEM_CLASS,
  WORKSPACE_NAV_PRIMARY_ADD_CLASS,
  WORKSPACE_NAV_SCROLL_AREA_CLASS,
  WORKSPACE_NAV_SCROLL_INNER_FLUSH_CLASS,
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
    <aside className={WORKSPACE_NAV_ASIDE_CLASS}>
      <div className={WORKSPACE_NAV_SEARCH_WRAP_CLASS}>
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search"
        />
        {canManage ? (
          <Button
            type="button"
            variant="brand"
            className={WORKSPACE_NAV_PRIMARY_ADD_CLASS}
            onClick={onAdd}
          >
            Add Staff Member
          </Button>
        ) : null}
      </div>

      <ScrollArea className={WORKSPACE_NAV_SCROLL_AREA_CLASS}>
        <div className={WORKSPACE_NAV_SCROLL_INNER_FLUSH_CLASS}>
          {isLoading ? (
            <LoadingState
              variant="inline"
              label="Loading staff…"
              className="px-[var(--workspace-nav-person-item-padding-x)] py-4"
            />
          ) : isError ? (
            <p className="px-[var(--workspace-nav-person-item-padding-x)] py-4 text-sm text-destructive">
              {errorMessage ?? "Could not load staff members."}
            </p>
          ) : members.length === 0 ? (
            <p className="px-[var(--workspace-nav-person-item-padding-x)] py-4 text-sm text-muted-foreground">
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
                    WORKSPACE_NAV_PERSON_ITEM_CLASS,
                    selected
                      ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
                      : WORKSPACE_NAV_ITEM_IDLE_CLASS,
                  )}
                >
                  <ProfileAvatar name={label} size="sm" className="size-8" />
                  <span className="min-w-0 flex-1 truncate text-left font-medium">
                    {label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
