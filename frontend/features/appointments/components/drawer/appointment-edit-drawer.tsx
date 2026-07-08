"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DrawerShell,
  DRAWER_FOOTER_BUTTON_CLASS,
} from "@/components/layout/drawer-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Textarea } from "@/components/ui/textarea";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import type { Contact } from "@/features/contacts/types";
import {
  getAppointment,
  updateAppointment,
} from "@/features/appointments/api/appointments.api";
import {
  getContactDisplayName,
  type Appointment,
} from "@/features/appointments/schemas/appointment-profile";
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

export interface AppointmentEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string | null;
  onSuccess?: () => void;
}

function appointmentToServiceSelections(
  appointment: Appointment,
): ServicePickerSelection[] {
  return (appointment.services ?? []).map((line) => ({
    serviceId: line.serviceId,
    name: line.service.name,
    durationMinutes:
      line.durationMinutes ?? line.service.durationMinutes ?? 0,
    price: line.price ?? line.service.price,
  }));
}

export function AppointmentEditDrawer({
  open,
  onOpenChange,
  appointmentId,
  onSuccess,
}: AppointmentEditDrawerProps) {
  const queryClient = useQueryClient();
  const { data: business } = useCurrentBusiness();

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const { data: appointment, isLoading } = useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId ?? ""),
    queryFn: () => getAppointment(appointmentId!),
    enabled: open && Boolean(appointmentId),
  });

  const timezone = useMemo(
    () =>
      resolveAppointmentDisplayTimezone(
        business?.timezone,
        appointment?.calendarId,
        calendars?.items,
      ),
    [business?.timezone, appointment?.calendarId, calendars?.items],
  );

  const [contactId, setContactId] = useState("");
  const [contactLabel, setContactLabel] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [services, setServices] = useState<ServicePickerSelection[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!appointment) return;
    setContactId(appointment.contactId);
    setContactLabel(getContactDisplayName(appointment.contact));
    setStartAt(utcToLocalDateTimeInputValue(appointment.startAt, timezone));
    setEndAt(utcToLocalDateTimeInputValue(appointment.endAt, timezone));
    setServices(appointmentToServiceSelections(appointment));
    setNotes(appointment.notes ?? "");
  }, [appointment, timezone]);

  const currencyCode = business?.taxesAndCurrency?.currencyCode ?? "USD";

  const mutation = useMutation({
    mutationFn: () => {
      if (!appointment) {
        throw new Error("Appointment not found");
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

      return updateAppointment(appointment.id, {
        calendarId: appointment.calendarId,
        contactId,
        assignedToId: appointment.assignedToId ?? undefined,
        title: contactLabel.trim() || appointment.title,
        startAt: localDateTimeInputToUtc(startAt, timezone),
        endAt: localDateTimeInputToUtc(endAt, timezone),
        notes: notes.trim() || undefined,
        services: services.map((line) => ({
          serviceId: line.serviceId,
          assignedToId: appointment.assignedToId ?? undefined,
          durationMinutes: line.durationMinutes,
        })),
      });
    },
    onSuccess: (saved) => {
      toast.success("Appointment updated");
      if (saved.googleSyncWarning) {
        toast.warning(`Saved, but Google sync failed: ${saved.googleSyncWarning}`);
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
      onOpenChange(false);
      onSuccess?.();
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
      title="Edit Appointment"
      footer={
        <ActionButton
          type="button"
          className={DRAWER_FOOTER_BUTTON_CLASS}
          disabled={mutation.isPending || isLoading || !appointment}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Saving…" : "Save changes"}
        </ActionButton>
      }
    >
      {isLoading || !appointment ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <AppointmentDateTimeBar
            startAt={appointment.startAt}
            endAt={appointment.endAt}
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
      )}
    </DrawerShell>
  );
}
