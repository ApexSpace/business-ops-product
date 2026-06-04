"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  CALENDAR_EDIT_SECTIONS,
  type CalendarDetail,
  type CalendarEditSectionId,
  type CalendarFormValues,
  type CalendarType,
  type DayOfWeek,
} from "@/features/calendars/schemas/calendar-profile";
import { CalendarEditSectionNav } from "@/features/calendars/components/calendar-edit-section-nav";
import { CalendarEditGoogleSection } from "@/features/calendars/components/edit/calendar-edit-google-section";
import { CalendarEditBasicSection } from "@/features/calendars/components/edit/calendar-edit-basic-section";
import { CalendarEditStaffSection } from "@/features/calendars/components/edit/calendar-edit-staff-section";
import { CalendarEditAvailabilitySection } from "@/features/calendars/components/edit/calendar-edit-availability-section";
import { CalendarEditRulesSection } from "@/features/calendars/components/edit/calendar-edit-rules-section";
import { CalendarEditAdvancedSection } from "@/features/calendars/components/edit/calendar-edit-advanced-section";
import { CalendarEditFormSection } from "@/features/calendars/components/edit/calendar-edit-form-section";
import { CalendarEditPaymentsSection } from "@/features/calendars/components/edit/calendar-edit-payments-section";
import { CalendarEditNotificationsSection } from "@/features/calendars/components/edit/calendar-edit-notifications-section";
import { CalendarEditWidgetSection } from "@/features/calendars/components/edit/calendar-edit-widget-section";
import type { IntegrationResourcesListResponse } from "@/features/integrations/utils/integration-resources";

export { CalendarEditSectionNav, CALENDAR_EDIT_SECTIONS };

type AvailabilitySlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
};

interface CalendarEditSectionsProps {
  form: UseFormReturn<CalendarFormValues>;
  sectionId: CalendarEditSectionId;
  calendarType: CalendarType;
  calendarId?: string;
  detail?: CalendarDetail;
  availability: AvailabilitySlot[];
  onAvailabilityChange: (slots: AvailabilitySlot[]) => void;
  googleResources?: IntegrationResourcesListResponse;
}

const CLASS_TYPES: CalendarType[] = ["CLASS_EVENT"];
const MULTI_STAFF_TYPES: CalendarType[] = [
  "ROUND_ROBIN",
  "COLLECTIVE",
  "CLASS_EVENT",
];

export function CalendarEditSectionContent({
  form,
  sectionId,
  calendarType,
  calendarId,
  detail,
  availability,
  onAvailabilityChange,
  googleResources,
}: CalendarEditSectionsProps) {
  const googleCalendarOptions =
    googleResources?.resources.map((r) => ({
      value: r.id,
      label: r.name,
    })) ?? [];

  const sectionProps = {
    form,
    calendarType,
    calendarId,
    detail,
    availability,
    onAvailabilityChange,
    googleResources,
    googleCalendarOptions,
    isClassType: CLASS_TYPES.includes(calendarType),
    isMultiStaff: MULTI_STAFF_TYPES.includes(calendarType),
  };

  switch (sectionId) {
    case "basic":
      return <CalendarEditBasicSection {...sectionProps} />;
    case "staff":
      return <CalendarEditStaffSection {...sectionProps} />;
    case "availability":
      return <CalendarEditAvailabilitySection {...sectionProps} />;
    case "rules":
      return <CalendarEditRulesSection {...sectionProps} />;
    case "advanced":
      return <CalendarEditAdvancedSection {...sectionProps} />;
    case "form":
      return <CalendarEditFormSection {...sectionProps} />;
    case "payments":
      return <CalendarEditPaymentsSection {...sectionProps} />;
    case "notifications":
      return <CalendarEditNotificationsSection {...sectionProps} />;
    case "widget":
      return <CalendarEditWidgetSection {...sectionProps} />;
    case "google":
      return (
        <CalendarEditGoogleSection
          form={form}
          calendarId={calendarId}
          googleResources={googleResources}
          googleCalendarOptions={googleCalendarOptions}
        />
      );
    default:
      return null;
  }
}
