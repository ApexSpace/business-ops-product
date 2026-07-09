"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DrawerShell,
  DRAWER_FOOTER_BUTTON_CLASS,
} from "@/components/layout/drawer-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import type { Contact } from "@/features/contacts/types";
import {
  getAppointment,
  updateAppointment,
} from "@/features/appointments/api/appointments.api";
import { AppointmentBookingDateTimeFields } from "@/features/appointments/components/appointment-booking-datetime-fields";
import {
  AppointmentServiceLineEditor,
  type AppointmentServiceLineSelection,
  type StaffOption,
} from "@/features/appointments/components/appointment-service-line-editor";
import {
  getContactDisplayName,
  type Appointment,
} from "@/features/appointments/schemas/appointment-profile";
import {
  appointmentLinesFromResponse,
  buildAppointmentSchedulePayload,
  rechainAllServiceLines,
  scheduleFromUtcIso,
} from "@/features/appointments/utils/appointment-service-lines";
import { getCalendarSchedulingConfig } from "@/features/appointments/utils/appointment-scheduling";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { resolveAppointmentDisplayTimezone } from "@/features/calendars/utils/timezone";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { queryKeys } from "@/lib/query/keys";
import {
  DRAWER_FIELD_CONTROL_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_FORM_ITEM_CLASS,
  DRAWER_FORM_STACK_CLASS,
  DRAWER_PRIMARY_FOOTER_BUTTON_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import { cn } from "@/lib/utils";

const NOTES_MAX_LENGTH = 400;

export interface AppointmentEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string | null;
  /** Authoritative timezone from the calendar grid (keeps displayed time consistent). */
  timezone?: string;
  onSuccess?: () => void;
}

function memberLabel(member: {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}): string {
  const name = [member.user.firstName, member.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name || member.user.email;
}

function appointmentToServiceSelections(
  appointment: Appointment,
  timezone: string,
  fallbackAssignedToId: string,
): AppointmentServiceLineSelection[] {
  return appointmentLinesFromResponse(
    appointment.services ?? [],
    fallbackAssignedToId,
    appointment.startAt,
    timezone,
  );
}

export function AppointmentEditDrawer({
  open,
  onOpenChange,
  appointmentId,
  timezone: timezoneProp,
  onSuccess,
}: AppointmentEditDrawerProps) {
  const queryClient = useQueryClient();
  const { data: business } = useCurrentBusiness();

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
  });

  const { data: appointment, isLoading } = useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId ?? ""),
    queryFn: () => getAppointment(appointmentId!),
    enabled: open && Boolean(appointmentId),
  });

  const resolvedTimezone = useMemo(
    () =>
      resolveAppointmentDisplayTimezone(
        business?.timezone,
        appointment?.calendarId,
        calendars?.items,
      ),
    [business?.timezone, appointment?.calendarId, calendars?.items],
  );
  const timezone = timezoneProp ?? resolvedTimezone;

  const selectedCalendar = useMemo(
    () =>
      calendars?.items.find((calendar) => calendar.id === appointment?.calendarId),
    [calendars?.items, appointment?.calendarId],
  );

  const schedulingConfig = getCalendarSchedulingConfig(selectedCalendar);

  const staffOptions: StaffOption[] = useMemo(
    () =>
      (members?.items ?? []).map((member) => ({
        userId: member.userId,
        label: memberLabel(member),
      })),
    [members?.items],
  );

  const defaultAssignedToId =
    appointment?.assignedToId ?? staffOptions[0]?.userId ?? "";

  const [contactId, setContactId] = useState("");
  const [contactLabel, setContactLabel] = useState("");
  const [dateKey, setDateKey] = useState("");
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [services, setServices] = useState<AppointmentServiceLineSelection[]>([]);
  const [notes, setNotes] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);

  useEffect(() => {
    if (!appointment) return;
    const schedule = scheduleFromUtcIso(
      appointment.startAt,
      appointment.endAt,
      timezone,
    );
    setContactId(appointment.contactId ?? "");
    setContactLabel(getContactDisplayName(appointment.contact));
    setDateKey(schedule.dateKey);
    setStartMinutes(schedule.appointmentStartMinutes);
    setServices(
      appointmentToServiceSelections(
        appointment,
        timezone,
        defaultAssignedToId,
      ),
    );
    setNotes(appointment.notes ?? "");
    setSendConfirmation(true);
  }, [appointment, timezone, defaultAssignedToId]);

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
      if (!dateKey) {
        throw new Error("Select a date");
      }

      const schedule = buildAppointmentSchedulePayload({
        dateKey,
        appointmentStartMinutes: startMinutes,
        lines: rechainAllServiceLines(services, startMinutes),
        timezone,
      });

      return updateAppointment(appointment.id, {
        calendarId: appointment.calendarId,
        contactId,
        assignedToId:
          schedule.services[0]?.assignedToId ??
          appointment.assignedToId ??
          undefined,
        title: contactLabel.trim() || appointment.title,
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        notes: notes.trim() || undefined,
        sendConfirmation,
        services: schedule.services,
      });
    },
    onSuccess: (saved) => {
      if (saved.googleSyncWarning) {
        toast.warning(`Saved, but Google sync failed: ${saved.googleSyncWarning}`);
      }
      if (saved.scheduleWarning) {
        toast.warning(saved.scheduleWarning);
      }
      toast.success("Appointment updated");
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

  const handleStartMinutesChange = (minutes: number) => {
    setStartMinutes(minutes);
    setServices((current) => rechainAllServiceLines(current, minutes));
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="compact"
      title="Edit Appointment"
      footer={
        <ActionButton
          type="button"
          className={cn(
            DRAWER_FOOTER_BUTTON_CLASS,
            DRAWER_PRIMARY_FOOTER_BUTTON_CLASS,
          )}
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
        <div className={DRAWER_FORM_STACK_CLASS}>
          <AppointmentBookingDateTimeFields
            dateKey={dateKey}
            startMinutes={startMinutes}
            slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
            onDateChange={setDateKey}
            onStartMinutesChange={handleStartMinutesChange}
          />

          <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
            <ContactPicker
              value={contactId}
              onValueChange={setContactId}
              onContactSelect={handleContactSelect}
              placeholder="Search client…"
              triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
            />
          </div>

          <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
            <AppointmentServiceLineEditor
              value={services}
              onChange={setServices}
              staffOptions={staffOptions}
              defaultAssignedToId={defaultAssignedToId}
              appointmentStartMinutes={startMinutes}
              onAppointmentStartMinutesChange={handleStartMinutesChange}
              slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
              currencyCode={currencyCode}
            />
          </div>

          <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
            <div className="relative">
              <FileText className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add a note…"
                rows={4}
                maxLength={NOTES_MAX_LENGTH}
                className={cn(
                  DRAWER_FIELD_CONTROL_CLASS,
                  "min-h-[110px] resize-none py-3 pl-10",
                )}
              />
              <span className="pointer-events-none absolute right-3 bottom-3 text-[11px] text-muted-foreground">
                {notes.length} / {NOTES_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox
              id="edit-send-confirmation"
              checked={sendConfirmation}
              onCheckedChange={(checked) =>
                setSendConfirmation(checked === true)
              }
            />
            <Label
              htmlFor="edit-send-confirmation"
              className="text-[13.5px] font-medium text-foreground"
            >
              Send confirmation to client
            </Label>
          </div>
        </div>
      )}
    </DrawerShell>
  );
}
