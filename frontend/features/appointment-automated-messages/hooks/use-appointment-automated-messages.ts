"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAppointmentAutomatedMessageCatalog,
  getAppointmentAutomatedMessages,
  type AppointmentAutomatedMessageEventType,
} from "@/features/appointment-automated-messages/api/appointment-automated-messages.api";
import { queryKeys } from "@/lib/query/keys";

export function useAppointmentAutomatedMessages(
  eventType: AppointmentAutomatedMessageEventType,
) {
  return useQuery({
    queryKey: queryKeys.appointmentAutomatedMessages.detail(eventType),
    queryFn: () => getAppointmentAutomatedMessages(eventType),
  });
}

export function useAppointmentAutomatedMessageCatalog(
  eventType: AppointmentAutomatedMessageEventType,
) {
  return useQuery({
    queryKey: queryKeys.appointmentAutomatedMessages.catalog(eventType),
    queryFn: () => getAppointmentAutomatedMessageCatalog(eventType),
  });
}
