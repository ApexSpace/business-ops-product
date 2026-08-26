"use client";

import { Search  } from "lucide-react";
import { LoadingState } from "@/components/data-display/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { StatusBadge } from "@/components/data-display/status-badge";
import { cn } from "@/lib/utils";
import type { BusinessMember } from "@/features/settings/types";

function memberLabel(member: BusinessMember) {
  const name = [member.user.firstName, member.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name || member.user.email;
}

type Props = {
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

export function TeamMemberList({
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
}: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-background">
      <div className="space-y-2 border-b p-3">
        {canManage ? (
          <Button type="button" className="w-full" size="sm" onClick={onAdd}>
            Add staff member
          </Button>
        ) : null}
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search staff…"
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingState
            variant="inline"
            label="Loading staff…"
            className="px-3 py-4"
          />
        ) : isError ? (
          <p className="px-3 py-4 text-sm text-destructive">
            {errorMessage ?? "Could not load staff members."}
          </p>
        ) : members.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            {search.trim()
              ? "No staff match your search."
              : "No staff members yet. Add your first team member to get started."}
          </p>
        ) : (
          members.map((member) => {
          const selected = member.userId === selectedUserId;
          return (
            <button
              key={member.userId}
              type="button"
              onClick={() => onSelect(member.userId)}
              className={cn(
                "flex w-full items-start gap-2 border-b px-3 py-3 text-left transition-colors",
                selected ? "bg-muted/60" : "hover:bg-muted/30",
              )}
            >
              <ProfileAvatar
                name={memberLabel(member)}
                className="size-9 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {memberLabel(member)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
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
    </aside>
  );
}
