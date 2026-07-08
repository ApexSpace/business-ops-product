"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StaffMemberOption {
  userId: string;
  label: string;
  avatarUrl?: string | null;
}

interface StaffSelectorProps {
  mode: "single" | "multi";
  members: StaffMemberOption[];
  /** Week view: single selected staff userId */
  selectedStaffId?: string;
  onSelectedStaffIdChange?: (userId: string) => void;
  /** Day view: visible staff userIds */
  visibleStaffIds?: string[];
  onVisibleStaffIdsChange?: (ids: string[]) => void;
  className?: string;
}

export function StaffSelector({
  mode,
  members,
  selectedStaffId,
  onSelectedStaffIdChange,
  visibleStaffIds = [],
  onVisibleStaffIdsChange,
  className,
}: StaffSelectorProps) {
  const selectedMember = useMemo(
    () => members.find((m) => m.userId === selectedStaffId),
    [members, selectedStaffId],
  );

  if (mode === "single") {
    return (
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn("h-9 max-w-[14rem] gap-2", className)}
            />
          }
        >
          <ProfileAvatar
            name={selectedMember?.label ?? "Staff"}
            avatarUrl={selectedMember?.avatarUrl}
            className="size-6"
            fallbackClassName="text-[10px]"
          />
          <span className="truncate text-sm">
            {selectedMember?.label ?? "All staff"}
          </span>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-64 p-2">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Staff member
          </p>
          {members.map((member) => (
            <button
              key={member.userId}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
              onClick={() => onSelectedStaffIdChange?.(member.userId)}
            >
              <ProfileAvatar
                name={member.label}
                avatarUrl={member.avatarUrl}
                className="size-7"
                fallbackClassName="text-[10px]"
              />
              <span className="flex-1 truncate">{member.label}</span>
              {selectedStaffId === member.userId ? (
                <Check className="size-4 text-primary" />
              ) : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  const visibleSet = new Set(visibleStaffIds);
  const allSelected =
    members.length > 0 && members.every((m) => visibleSet.has(m.userId));

  const toggle = (userId: string) => {
    if (!onVisibleStaffIdsChange) return;
    if (visibleSet.has(userId)) {
      onVisibleStaffIdsChange(
        visibleStaffIds.filter((id) => id !== userId),
      );
    } else {
      onVisibleStaffIdsChange([...visibleStaffIds, userId]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 gap-2", className)}
          />
        }
      >
        <span className="text-sm">
          {allSelected
            ? "All staff"
            : `${visibleStaffIds.length} staff selected`}
        </span>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-72 p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="text-xs font-medium text-muted-foreground">
            Show on calendar
          </p>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() =>
              onVisibleStaffIdsChange?.(
                allSelected ? [] : members.map((m) => m.userId),
              )
            }
          >
            {allSelected ? "Unselect all" : "Select all"}
          </button>
        </div>
        {members.map((member) => {
          const checked = visibleSet.has(member.userId);
          return (
            <button
              key={member.userId}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
              onClick={() => toggle(member.userId)}
            >
              <ProfileAvatar
                name={member.label}
                avatarUrl={member.avatarUrl}
                className="size-7"
                fallbackClassName="text-[10px]"
              />
              <span className="flex-1 truncate">{member.label}</span>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  checked && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {checked ? <Check className="size-3" /> : null}
              </span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
