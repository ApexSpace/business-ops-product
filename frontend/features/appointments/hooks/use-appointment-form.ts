"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  appointmentFormDefaults,
  appointmentFormSchema,
  appointmentFormToApiBody,
  appointmentToForm,
  type Appointment,
  type AppointmentFormValues,
} from "@/features/appointments/schemas/appointment-profile";
import {
  resolveAppointmentLocationMode,
  type AppointmentLocationMode,
  type Calendar as CalendarType,
} from "@/features/calendars/schemas/calendar-profile";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import { resolveAppointmentDisplayTimezone } from "@/features/calendars/utils/timezone";
import { createAppointment, updateAppointment } from "@/features/appointments/api/appointments.api";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import type { Contact } from "@/features/contacts/types";

function buildInitialFormValues(
  appointment: Appointment | null | undefined,
  opts: {
    businessTimezone?: string | null;
    defaultContactId?: string;
    defaultContactLabel?: string;
    defaultStartAt?: string;
    defaultEndAt?: string;
    defaultCalendarId?: string;
  },
): AppointmentFormValues {
  if (appointment) {
    const tz = resolveAppointmentDisplayTimezone(
      opts.businessTimezone,
      appointment.calendarId,
      undefined,
    );
    return appointmentToForm(appointment, tz);
  }
  return {
    ...appointmentFormDefaults,
    contactId: opts.defaultContactId ?? "",
    title: opts.defaultContactLabel ?? "",
    startAt: opts.defaultStartAt ?? "",
    endAt: opts.defaultEndAt ?? "",
    calendarId: opts.defaultCalendarId ?? "",
  };
}

export interface UseAppointmentFormOptions {
  sessionKey: string;
  open: boolean;
  appointment?: Appointment | null;
  businessTimezone?: string | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  defaultStartAt?: string;
  defaultEndAt?: string;
  defaultCalendarId?: string;
  lockContact?: boolean;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useAppointmentForm({
  sessionKey,
  open,
  appointment,
  businessTimezone,
  defaultContactId,
  defaultContactLabel,
  defaultStartAt,
  defaultEndAt,
  defaultCalendarId,
  lockContact,
  onSuccess,
  onOpenChange,
}: UseAppointmentFormOptions) {
  const isEdit = !!appointment;
  const canAssign = useCan(PERMISSIONS["members.invite"]);

  const initialValues = useMemo(
    () =>
      buildInitialFormValues(appointment, {
        businessTimezone,
        defaultContactId,
        defaultContactLabel,
        defaultStartAt,
        defaultEndAt,
        defaultCalendarId,
      }),
    [sessionKey],
  );

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const watchedCalendarId = form.watch("calendarId");

  const [contactDisplayName, setContactDisplayName] = useState(
    () =>
      defaultContactLabel ??
      (appointment
        ? appointment.contact.displayName ??
          [appointment.contact.firstName, appointment.contact.lastName]
            .filter(Boolean)
            .join(" ") ??
          appointment.contact.email ??
          ""
        : ""),
  );
  const [showDescription, setShowDescription] = useState(
    () => Boolean(appointment?.description?.trim()),
  );
  const [showNotes, setShowNotes] = useState(() =>
    Boolean(appointment?.notes?.trim()),
  );
  const [locationMode, setLocationMode] = useState<AppointmentLocationMode>(
    () => "calendar_default",
  );

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: open,
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled: open && canAssign,
  });

  const selectedCalendar = useMemo(
    () => calendars?.items.find((c) => c.id === watchedCalendarId) ?? null,
    [calendars?.items, watchedCalendarId],
  );

  const displayTimezone = useMemo(
    () =>
      resolveAppointmentDisplayTimezone(
        businessTimezone,
        watchedCalendarId || defaultCalendarId || appointment?.calendarId,
        calendars?.items,
      ),
    [
      businessTimezone,
      watchedCalendarId,
      defaultCalendarId,
      appointment?.calendarId,
      calendars?.items,
    ],
  );

  const editTimezoneSynced = useRef(false);

  useEffect(() => {
    if (!isEdit || !appointment || !calendars?.items.length) return;
    const cal = calendars.items.find((c) => c.id === appointment.calendarId);
    if (cal) {
      setLocationMode(resolveAppointmentLocationMode(appointment, cal));
    }
    if (!editTimezoneSynced.current && !form.formState.isDirty) {
      form.reset(appointmentToForm(appointment, displayTimezone));
      editTimezoneSynced.current = true;
    }
  }, [isEdit, appointment, calendars?.items, displayTimezone, form]);

  const mutation = useMutation({
    mutationFn: (values: AppointmentFormValues) => {
      const title =
        !isEdit && contactDisplayName.trim()
          ? contactDisplayName.trim()
          : values.title.trim();
      let body = appointmentFormToApiBody(
        { ...values, title },
        displayTimezone,
      );
      if (locationMode === "calendar_default" && selectedCalendar) {
        body = {
          ...body,
          locationType: selectedCalendar.locationType,
          locationValue: selectedCalendar.locationValue?.trim() || undefined,
        };
      }
      if (isEdit && appointment) {
        return updateAppointment(appointment.id, body);
      }
      return createAppointment(body);
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? "Appointment updated" : "Appointment created");
      if (saved.googleSyncWarning) {
        toast.warning(`Saved, but Google sync failed: ${saved.googleSyncWarning}`);
      }
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const calendarOptions =
    calendars?.items.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const memberOptions =
    members?.items.map((m) => ({
      value: m.user.id,
      label:
        [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
        m.user.email,
    })) ?? [];

  const handleContactSelect = (contact: Contact) => {
    setContactDisplayName(contact.label);
    if (!isEdit) {
      form.setValue("title", contact.label, { shouldDirty: true });
    }
  };

  return {
    isEdit,
    canAssign,
    form,
    mutation,
    contactDisplayName,
    showDescription,
    setShowDescription,
    showNotes,
    setShowNotes,
    locationMode,
    setLocationMode,
    selectedCalendar: selectedCalendar as CalendarType | null,
    displayTimezone,
    calendarOptions,
    memberOptions,
    handleContactSelect,
    defaultContactId,
    defaultContactLabel,
    lockContact,
  };
}

export type UseAppointmentFormReturn = ReturnType<typeof useAppointmentForm>;
