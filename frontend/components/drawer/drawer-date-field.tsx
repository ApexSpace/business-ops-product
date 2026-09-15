"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { DrawerCalendarIcon } from "@/components/drawer/drawer-icons";
import {
  DRAWER_BOOKING_DATETIME_CELL_CLASS,
  DRAWER_FIELD_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateKey(dateKey: string): Date | null {
  if (!dateKey) return null;
  const date = new Date(`${dateKey}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateKeyShort(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey || "Select date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthGridDays(visible: Date): Date[] {
  const first = new Date(visible.getFullYear(), visible.getMonth(), 1, 12);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function DrawerDateMonthGrid({
  dateKey,
  onSelect,
}: {
  dateKey: string;
  onSelect: (next: string) => void;
}) {
  const selected = parseDateKey(dateKey);
  const [visible, setVisible] = useState(
    () => selected ?? new Date(),
  );
  const days = useMemo(() => monthGridDays(visible), [visible]);
  const monthLabel = visible.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const todayKey = toDateKey(new Date());
  const selectedKey = selected ? toDateKey(selected) : "";

  return (
    <div className="w-[17.5rem]">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() =>
            setVisible(
              new Date(visible.getFullYear(), visible.getMonth() - 1, 1, 12),
            )
          }
        >
          <NavArrowIcon direction="left" size="lg" />
        </Button>
        <span className="min-w-[8rem] text-center text-sm font-medium">
          {monthLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={() =>
            setVisible(
              new Date(visible.getFullYear(), visible.getMonth() + 1, 1, 12),
            )
          }
        >
          <NavArrowIcon direction="right" size="lg" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex size-8 items-center justify-center text-[10px] font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = toDateKey(day);
          const inMonth = day.getMonth() === visible.getMonth();
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-md text-sm transition-colors",
                "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !inMonth && "text-muted-foreground/50",
                inMonth && "text-foreground",
                isSelected &&
                  "bg-primary font-medium text-primary-foreground hover:bg-primary/90",
                isToday &&
                  !isSelected &&
                  "font-semibold text-primary underline-offset-2",
              )}
              onClick={() => onSelect(key)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface DrawerDateFieldProps {
  dateKey?: string;
  /** Pre-formatted label for read-only display */
  displayValue?: string;
  onDateChange?: (dateKey: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
  id?: string;
  className?: string;
}

export function DrawerDateField({
  dateKey = "",
  displayValue,
  onDateChange,
  disabled = false,
  readOnly = false,
  onClick,
  id = "drawer-date",
  className,
}: DrawerDateFieldProps) {
  const dateLabel = displayValue ?? formatDateKeyShort(dateKey);
  const [open, setOpen] = useState(false);

  if (readOnly || !onDateChange) {
    return (
      <div className={cn(DRAWER_BOOKING_DATETIME_CELL_CLASS, className)}>
        <span className={DRAWER_FIELD_LABEL_CLASS}>Date</span>
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className={cn(
            DRAWER_FIELD_CLASS,
            "flex w-full items-center gap-2 text-left",
            onClick ? "cursor-pointer hover:bg-violet-primary-surface/40" : "cursor-default",
          )}
        >
          <DrawerCalendarIcon />
          <span className="min-w-0 truncate text-[14px] font-medium text-[#1A1A1A]">
            {dateLabel}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn(DRAWER_BOOKING_DATETIME_CELL_CLASS, className)}>
      <Label htmlFor={id} className={DRAWER_FIELD_LABEL_CLASS}>
        Date
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              id={id}
              aria-label={`Date, ${dateLabel}`}
              className={cn(
                DRAWER_FIELD_CLASS,
                "flex w-full cursor-pointer items-center gap-2 text-left",
                disabled && "pointer-events-none opacity-60",
              )}
            />
          }
        >
          <DrawerCalendarIcon />
          <span className="min-w-0 truncate text-[14px] font-medium text-[#1A1A1A]">
            {dateLabel}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          {open ? (
            <DrawerDateMonthGrid
              key={dateKey}
              dateKey={dateKey}
              onSelect={(next) => {
                onDateChange(next);
                setOpen(false);
              }}
            />
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
