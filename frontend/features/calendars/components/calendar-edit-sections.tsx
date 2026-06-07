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
import { CalendarEditGeneralSection } from "@/features/calendars/components/edit/calendar-edit-general-section";
import { CalendarEditAvailabilityTabSection } from "@/features/calendars/components/edit/calendar-edit-availability-tab-section";
import { CalendarEditBookingLinkSection } from "@/features/calendars/components/edit/calendar-edit-booking-link-section";
import { CalendarEditGoogleSection } from "@/features/calendars/components/edit/calendar-edit-google-section";
import { CalendarEditAdvancedTabSection } from "@/features/calendars/components/edit/calendar-edit-advanced-tab-section";
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
    case "general":
      return <CalendarEditGeneralSection {...sectionProps} />;
    case "availability":
      return <CalendarEditAvailabilityTabSection {...sectionProps} />;
    case "booking-page":
      return <CalendarEditBookingLinkSection {...sectionProps} />;
    case "integrations":
      return (
        <CalendarEditGoogleSection
          form={form}
          calendarId={calendarId}
          googleResources={googleResources}
          googleCalendarOptions={googleCalendarOptions}
        />
      );
    case "advanced":
      return <CalendarEditAdvancedTabSection {...sectionProps} />;
    default:
      return null;
  }
}
