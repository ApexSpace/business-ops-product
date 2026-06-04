"use client";

import type { UseFormReturn } from "react-hook-form";
import type {
  CalendarDetail,
  CalendarFormValues,
  DayOfWeek,
  CalendarType,
} from "@/features/calendars/schemas/calendar-profile";
import type { IntegrationResourcesListResponse } from "@/features/integrations/utils/integration-resources";

export type AvailabilitySlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
};

export interface CalendarEditSectionProps {
  form: UseFormReturn<CalendarFormValues>;
  calendarType: CalendarType;
  calendarId?: string;
  detail?: CalendarDetail;
  availability: AvailabilitySlot[];
  onAvailabilityChange: (slots: AvailabilitySlot[]) => void;
  googleResources?: IntegrationResourcesListResponse;
  googleCalendarOptions?: { value: string; label: string }[];
  isClassType?: boolean;
  isMultiStaff?: boolean;
}
