"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DrawerShell,
  DRAWER_FOOTER_BUTTON_CLASS,
} from "@/components/layout/drawer-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Textarea } from "@/components/ui/textarea";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import type { Contact } from "@/features/contacts/types";
import { createAppointment } from "@/features/appointments/api/appointments.api";
import type { AppointmentCreateDefaults } from "@/features/appointments/hooks/use-appointment-drawer";
import {
  localDateTimeInputToUtc,
  resolveAppointmentDisplayTimezone,
  utcToLocalDateTimeInputValue,
} from "@/features/calendars/utils/timezone";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { queryKeys } from "@/lib/query/keys";
import {
  DRAWER_FIELD_CONTROL_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_FORM_ITEM_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import { cn } from "@/lib/utils";
import { AppointmentDateTimeBar } from "./appointment-drawer-sections";
import {
  ServicePicker,
  type ServicePickerSelection,
} from "@/features/appointments/components/service-picker";

export interface AppointmentCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: AppointmentCreateDefaults | null;
  defaultCalendarId?: string;
  onSuccess?: (appointmentId: string) => void;
}

export function AppointmentCreateDrawer({
  open,
  onOpenChange,
  defaults,
  defaultCalendarId,
  onSuccess,
}: AppointmentCreateDrawerProps) {
  const queryClient = useQueryClient();
  const { data: business } = useCurrentBusiness();

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const calendarId =
    defaults?.calendarId ?? defaultCalendarId ?? calendars?.items[0]?.id ?? "";

  const timezone = useMemo(
    () =>
      resolveAppointmentDisplayTimezone(
        business?.timezone,
        calendarId || undefined,
        calendars?.items,
      ),
    [business?.timezone, calendarId, calendars?.items],
  );

  const [contactId, setContactId] = useState("");
  const [contactLabel, setContactLabel] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [services, setServices] = useState<ServicePickerSelection[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !defaults) return;
    setContactId("");
    setContactLabel("");
    setServices([]);
    setNotes("");
    setStartAt(
      utcToLocalDateTimeInputValue(defaults.startAt, timezone),
    );
    setEndAt(utcToLocalDateTimeInputValue(defaults.endAt, timezone));
  }, [open, defaults, timezone]);

  const currencyCode = business?.taxesAndCurrency?.currencyCode ?? "USD";

  const mutation = useMutation({
    mutationFn: () => {
      if (!calendarId) {
        throw new Error("No calendar available");
      }
      if (!contactId) {
        throw new Error("Select a client");
      }
      if (!services.length) {
        throw new Error("Select at least one service");
      }
      if (!startAt || !endAt) {
        throw new Error("Set start and end times");
      }

      const title = contactLabel.trim() || "Appointment";

      return createAppointment({
        calendarId,
        contactId,
        assignedToId: defaults?.assignedToId,
        title,
        startAt: localDateTimeInputToUtc(startAt, timezone),
        endAt: localDateTimeInputToUtc(endAt, timezone),
        notes: notes.trim() || undefined,
        services: services.map((line) => ({
          serviceId: line.serviceId,
          assignedToId: defaults?.assignedToId,
          durationMinutes: line.durationMinutes,
        })),
      });
    },
    onSuccess: (saved) => {
      toast.success("Appointment created");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
      onOpenChange(false);
      onSuccess?.(saved.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleContactSelect = (contact: Contact) => {
    setContactLabel(contact.label);
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="standard"
      title="New Appointment"
      footer={
        <ActionButton
          type="button"
          className={DRAWER_FOOTER_BUTTON_CLASS}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Booking…" : "Book appointment"}
        </ActionButton>
      }
    >
      <div className="space-y-5">
        <AppointmentDateTimeBar
          startAt={defaults?.startAt ?? new Date().toISOString()}
          endAt={defaults?.endAt ?? new Date().toISOString()}
          timezone={timezone}
          editable
          startValue={startAt}
          endValue={endAt}
          onStartChange={setStartAt}
          onEndChange={setEndAt}
        />

        <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
          <span className={DRAWER_FIELD_LABEL_CLASS}>Client</span>
          <ContactPicker
            value={contactId}
            onValueChange={setContactId}
            onContactSelect={handleContactSelect}
            triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
          />
        </div>

        <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
          <span className={DRAWER_FIELD_LABEL_CLASS}>Services</span>
          <ServicePicker
            value={services}
            onChange={setServices}
            currencyCode={currencyCode}
          />
        </div>

        <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
          <span className={DRAWER_FIELD_LABEL_CLASS}>Notes</span>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add notes for this appointment…"
            rows={4}
            className={cn(DRAWER_FIELD_CONTROL_CLASS, "min-h-[110px] py-3")}
          />
        </div>
      </div>
    </DrawerShell>
  );
}
