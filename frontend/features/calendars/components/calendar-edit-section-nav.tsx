"use client";

import {
  CALENDAR_EDIT_SECTIONS,
  type CalendarEditSectionId,
} from "@/features/calendars/schemas/calendar-profile";
import { cn } from "@/lib/utils";

export function CalendarEditSectionNav({
  activeSection,
  onSectionChange,
}: {
  activeSection: CalendarEditSectionId;
  onSectionChange: (id: CalendarEditSectionId) => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {CALENDAR_EDIT_SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSectionChange(section.id)}
          className={cn(
            "rounded-md px-3 py-2 text-left text-sm transition-colors",
            activeSection === section.id
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
