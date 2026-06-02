"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { AppointmentMeetingLocationFields } from "@/components/appointments/appointment-meeting-location-fields";
import { AppointmentScheduleFields } from "@/components/appointments/appointment-schedule-fields";
import { FormDialog } from "@/components/forms/form-dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import {
  APPOINTMENT_STATUS_OPTIONS,
  appointmentFormDefaults,
  appointmentFormSchema,
  appointmentFormToApiBody,
  appointmentToForm,
  type Appointment,
  type AppointmentFormValues,
} from "@/lib/appointment-profile";
import {
  resolveAppointmentLocationMode,
  type AppointmentLocationMode,
} from "@/lib/calendar-profile";
import { canInviteMember } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-provider";
import type { BusinessMember, Contact, PaginatedResult } from "@/types/api";
import type { Calendar as CalendarType } from "@/lib/calendar-profile";
import { resolveAppointmentDisplayTimezone } from "@/lib/timezone";

interface AppointmentFormDialogProps {
  /** Changes when opening create/edit so the form remounts with fresh values */
  sessionKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  businessTimezone?: string | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  lockContact?: boolean;
  defaultStartAt?: string;
  defaultEndAt?: string;
  defaultCalendarId?: string;
  onSuccess: () => void;
  onDelete?: () => void;
  isDeletePending?: boolean;
}

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

export function AppointmentFormDialog({
  sessionKey,
  open,
  onOpenChange,
  appointment,
  businessTimezone,
  defaultContactId,
  defaultContactLabel,
  lockContact,
  defaultStartAt,
  defaultEndAt,
  defaultCalendarId,
  onSuccess,
  onDelete,
  isDeletePending,
}: AppointmentFormDialogProps) {
  const isEdit = !!appointment;
  const { jwt, contexts } = useAuth();
  const canAssign = canInviteMember(jwt, contexts);

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
    queryFn: () =>
      apiClient<PaginatedResult<CalendarType>>("calendars", {
        searchParams: { page: 1, limit: 100, status: "ACTIVE" },
      }),
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () =>
      apiClient<PaginatedResult<BusinessMember>>("businesses/current/members", {
        searchParams: { page: 1, limit: 100 },
      }),
    enabled: canAssign,
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
        return apiClient<Appointment>(`appointments/${appointment.id}`, {
          method: "PATCH",
          body,
        });
      }
      return apiClient<Appointment>("appointments", { method: "POST", body });
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

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit appointment" : "New appointment"}
      form={form}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
      isDeletePending={isDeletePending}
      submitLabel={isEdit ? "Save" : "Create"}
      onDelete={isEdit ? onDelete : undefined}
      deleteLabel="Delete"
      size="lg"
    >
      <FormField
        control={form.control}
        name="contactId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact</FormLabel>
            <ContactPicker
              value={field.value}
              onValueChange={field.onChange}
              onContactSelect={handleContactSelect}
              disabled={lockContact}
              lockedContact={
                lockContact && defaultContactId && defaultContactLabel
                  ? { id: defaultContactId, label: defaultContactLabel }
                  : undefined
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="calendarId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Calendar</FormLabel>
            <SearchableSelect
              items={calendarOptions}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Select calendar"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <AppointmentScheduleFields
        selectedCalendar={selectedCalendar}
        timezone={displayTimezone}
        disabled={mutation.isPending}
      />

      {isEdit ? (
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <input type="hidden" {...form.register("title")} />
      )}

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <SearchableSelect
              items={APPOINTMENT_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={field.value}
              onValueChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      {canAssign ? (
        <FormField
          control={form.control}
          name="assignedToId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned staff (optional)</FormLabel>
              <SearchableSelect
                items={[{ value: "", label: "Unassigned" }, ...memberOptions]}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                placeholder="Select team member"
              />
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <AppointmentMeetingLocationFields
        selectedCalendar={selectedCalendar}
        locationMode={locationMode}
        onLocationModeChange={setLocationMode}
        disabled={mutation.isPending}
      />

      {!showDescription || !showNotes ? (
        <div className="flex flex-wrap gap-2">
          {!showDescription ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDescription(true)}
            >
              <Plus className="mr-1.5 size-3.5" />
              Add description
            </Button>
          ) : null}
          {!showNotes ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNotes(true)}
            >
              <Plus className="mr-1.5 size-3.5" />
              Add internal notes
            </Button>
          ) : null}
        </div>
      ) : null}

      {showDescription ? (
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Notes visible to the customer (optional)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {showNotes ? (
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal notes</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Private team notes (optional)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </FormDialog>
  );
}
