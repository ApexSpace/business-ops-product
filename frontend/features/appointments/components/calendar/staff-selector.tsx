"use client";

import { useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CALENDAR_TOOLBAR_GHOST_BUTTON_CLASS } from "@/features/appointments/components/calendar/calendar-toolbar-tokens";

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

const STAFF_TRIGGER_CLASS = cn(
  CALENDAR_TOOLBAR_GHOST_BUTTON_CLASS,
  "max-w-[10.5rem] text-left sm:max-w-[12rem] lg:max-w-[13.5rem]",
);

function StaffAvatarStack({
  members,
  max = 3,
  avatarClassName = "size-8",
}: {
  members: StaffMemberOption[];
  max?: number;
  avatarClassName?: string;
}) {
  const shown = members.slice(0, max);
  const extra = members.length - max;

  if (shown.length === 0) {
    return (
      <ProfileAvatar
        name="Staff"
        className={avatarClassName}
        fallbackClassName="text-[10px]"
      />
    );
  }

  return (
    <div className="flex shrink-0 items-center">
      {shown.map((member, index) => (
        <ProfileAvatar
          key={member.userId}
          name={member.label}
          avatarUrl={member.avatarUrl}
          className={cn(
            avatarClassName,
            "ring-2 ring-background",
            index > 0 && "-ml-2.5",
          )}
          fallbackClassName="text-[10px]"
        />
      ))}
      {extra > 0 ? (
        <span
          className={cn(
            "-ml-2.5 flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-background",
            avatarClassName,
            "text-[10px]",
          )}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function StaffTriggerChevron({ className }: { className?: string }) {
  return (
    <ChevronDown
      className={cn("size-3.5 shrink-0 text-muted-foreground/80", className)}
      aria-hidden
    />
  );
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
    const displayName = selectedMember?.label ?? "All staff";

    return (
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`Staff: ${displayName}`}
              className={cn(STAFF_TRIGGER_CLASS, className)}
            />
          }
        >
          <ProfileAvatar
            name={displayName}
            avatarUrl={selectedMember?.avatarUrl}
            className="size-8"
            fallbackClassName="text-[10px]"
          />
          <span className="min-w-0 flex-1 truncate text-foreground">
            {displayName}
          </span>
          <StaffTriggerChevron />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Staff member
          </p>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/70",
              !selectedStaffId && "bg-muted/60",
            )}
            onClick={() => onSelectedStaffIdChange?.("")}
          >
            <StaffAvatarStack members={members} max={2} avatarClassName="size-8" />
            <span className="min-w-0 flex-1 truncate font-medium">
              All staff
            </span>
            {!selectedStaffId ? (
              <Check className="size-4 shrink-0 text-primary" />
            ) : null}
          </button>
          {members.map((member) => {
            const isSelected = selectedStaffId === member.userId;
            return (
              <button
                key={member.userId}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/70",
                  isSelected && "bg-muted/60",
                )}
                onClick={() => onSelectedStaffIdChange?.(member.userId)}
              >
                <ProfileAvatar
                  name={member.label}
                  avatarUrl={member.avatarUrl}
                  className="size-8"
                  fallbackClassName="text-[10px]"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {member.label}
                </span>
                {isSelected ? (
                  <Check className="size-4 shrink-0 text-primary" />
                ) : null}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    );
  }

  const visibleSet = new Set(visibleStaffIds);
  const allSelected =
    members.length > 0 && members.every((m) => visibleSet.has(m.userId));
  const visibleMembers = members.filter((m) => visibleSet.has(m.userId));
  const displayMembers = allSelected ? members : visibleMembers;
  const displayLabel = allSelected
    ? "All staff"
    : visibleMembers.length === 1
      ? visibleMembers[0]!.label
      : `${visibleMembers.length} staff`;

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
          <button
            type="button"
            aria-label={
              allSelected
                ? "All staff visible on calendar"
                : `${visibleMembers.length} staff visible on calendar`
            }
            className={cn(STAFF_TRIGGER_CLASS, className)}
          />
        }
      >
        <StaffAvatarStack members={displayMembers} />
        <span className="min-w-0 flex-1 truncate text-foreground">
          {displayLabel}
        </span>
        <StaffTriggerChevron />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Show on calendar
          </p>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
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
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/70",
                checked && "bg-muted/60",
              )}
              onClick={() => toggle(member.userId)}
            >
              <ProfileAvatar
                name={member.label}
                avatarUrl={member.avatarUrl}
                className="size-8"
                fallbackClassName="text-[10px]"
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {member.label}
              </span>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border border-border",
                  checked &&
                    "border-primary bg-primary text-primary-foreground",
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
