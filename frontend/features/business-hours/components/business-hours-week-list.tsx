"use client";

import { useCallback, useMemo, useState } from "react";
import { addDays, getWeekDays } from "@/features/calendars/utils/calendar-dates";
import { BusinessHoursDayEditor } from "@/features/business-hours/components/business-hours-day-editor";
import { BusinessHoursDayRow } from "@/features/business-hours/components/business-hours-day-row";
import {
  isTodayDate,
  WeekRangeHeader,
} from "@/features/business-hours/components/week-range-header";
import {
  dayOfWeekFromDate,
  slotNeedsAttention,
} from "@/features/business-hours/utils/format-business-hours";
import type { BusinessHoursSlot, DayOfWeek } from "@/features/business-hours/types";
import { cn } from "@/lib/utils";

interface BusinessHoursWeekListProps {
  slots: BusinessHoursSlot[];
  disabled?: boolean;
  isSaving?: boolean;
  onSaveDay: (dayOfWeek: DayOfWeek, slot: BusinessHoursSlot) => void;
  className?: string;
  /** When true, week navigator renders in the parent header instead. */
  hideWeekNavigator?: boolean;
  anchorDate?: Date;
  onAnchorDateChange?: (date: Date) => void;
}

function slotByDay(
  slots: BusinessHoursSlot[],
  dayOfWeek: DayOfWeek,
): BusinessHoursSlot {
  return slots.find((s) => s.dayOfWeek === dayOfWeek)!;
}

export function BusinessHoursWeekList({
  slots,
  disabled = false,
  isSaving = false,
  onSaveDay,
  className,
  hideWeekNavigator = false,
  anchorDate: anchorDateProp,
  onAnchorDateChange,
}: BusinessHoursWeekListProps) {
  const [internalAnchor, setInternalAnchor] = useState(() => new Date());
  const anchorDate = anchorDateProp ?? internalAnchor;
  const setAnchorDate = onAnchorDateChange ?? setInternalAnchor;

  const [expandedDay, setExpandedDay] = useState<DayOfWeek | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<DayOfWeek, BusinessHoursSlot>>>(
    {},
  );

  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);

  const openEditor = useCallback(
    (dayOfWeek: DayOfWeek) => {
      const slot = slotByDay(slots, dayOfWeek);
      setDrafts((prev) => ({ ...prev, [dayOfWeek]: { ...slot } }));
      setExpandedDay(dayOfWeek);
    },
    [slots],
  );

  const closeEditor = useCallback(() => {
    setExpandedDay(null);
  }, []);

  const getDraft = (dayOfWeek: DayOfWeek): BusinessHoursSlot => {
    return drafts[dayOfWeek] ?? slotByDay(slots, dayOfWeek);
  };

  const isDraftDirty = (dayOfWeek: DayOfWeek): boolean => {
    const draft = drafts[dayOfWeek];
    if (!draft) return false;
    const saved = slotByDay(slots, dayOfWeek);
    return JSON.stringify(draft) !== JSON.stringify(saved);
  };

  const weekNavigator = hideWeekNavigator ? null : (
    <WeekRangeHeader
      anchorDate={anchorDate}
      onPrevious={() => setAnchorDate(addDays(anchorDate, -7))}
      onNext={() => setAnchorDate(addDays(anchorDate, 7))}
    />
  );

  return (
    <div className={cn("flex w-full min-w-0 flex-col", className)}>
      {!hideWeekNavigator ? (
        <div className="mb-[var(--spacing-4)] flex justify-end">{weekNavigator}</div>
      ) : null}

      <div className="w-full min-w-0 overflow-hidden rounded-[var(--radius-control)] border border-border/60 bg-card">
        {weekDays.map((date) => {
          const dayOfWeek = dayOfWeekFromDate(date);
          const slot = slotByDay(slots, dayOfWeek);
          const isExpanded = expandedDay === dayOfWeek;
          const draft = getDraft(dayOfWeek);
          const today = isTodayDate(date);

          return (
            <div key={dayOfWeek} className="w-full min-w-0">
              {isExpanded ? (
                <BusinessHoursDayEditor
                  date={date}
                  slot={slot}
                  draft={draft}
                  isToday={today}
                  disabled={disabled}
                  isDirty={isDraftDirty(dayOfWeek)}
                  isSaving={isSaving}
                  onDraftChange={(next) =>
                    setDrafts((prev) => ({ ...prev, [dayOfWeek]: next }))
                  }
                  onClose={closeEditor}
                  onDiscard={() => {
                    setDrafts((prev) => {
                      const next = { ...prev };
                      delete next[dayOfWeek];
                      return next;
                    });
                    closeEditor();
                  }}
                  onSave={() => {
                    if (slotNeedsAttention(draft)) return;
                    onSaveDay(dayOfWeek, draft);
                    setDrafts((prev) => {
                      const next = { ...prev };
                      delete next[dayOfWeek];
                      return next;
                    });
                    closeEditor();
                  }}
                />
              ) : (
                <BusinessHoursDayRow
                  date={date}
                  slot={slot}
                  isToday={today}
                  disabled={disabled}
                  onEdit={() => openEditor(dayOfWeek)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { WeekRangeHeader };
