"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActionButton } from "@/components/ui/action-button";
import { DrawerAddAction } from "@/components/drawer/drawer-add-action";
import { DrawerItemAddLayout } from "@/components/drawer/drawer-item-add-layout";
import { DrawerCheckboxRow } from "@/components/drawer/drawer-checkbox-row";
import { DrawerFormFieldGroup } from "@/components/drawer/drawer-form-field-group";
import { DrawerFormFields } from "@/components/drawer/drawer-form-fields";
import { Textarea } from "@/components/ui/textarea";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import type { Contact } from "@/features/contacts/types";
import { updateAppointment } from "@/features/appointments/api/appointments.api";
import { AppointmentDateTimeFields } from "@/features/appointments/components/drawer/appointment-datetime-fields";
import { AppointmentClientCard } from "@/features/appointments/components/drawer/appointment-client-card";
import { AppointmentBookingDetails } from "@/features/appointments/components/drawer/appointment-booking-details";
import {
  AppointmentServiceLineEditor,
  AppointmentServicePicker,
  AppointmentServiceCombobox,
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
  getChainedStartMinutes,
  rechainAllServiceLines,
  scheduleFromUtcIso,
  serviceToLineSelection,
} from "@/features/appointments/utils/appointment-service-lines";
import { getCalendarSchedulingConfig } from "@/features/appointments/utils/appointment-scheduling";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { queryKeys } from "@/lib/query/keys";
import type { Service } from "@/lib/types/api";
import {
  APPOINTMENT_DRAWER_ADD_ACTION_CLASS,
  APPOINTMENT_DRAWER_FIELD_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

const NOTES_MAX_LENGTH = 400;

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

function contactToClientCard(
  contact: Contact,
): NonNullable<Appointment["contact"]> {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    displayName: contact.displayName,
    email: contact.email,
    phoneNumber: contact.phoneNumber ?? contact.phone,
    createdAt: contact.createdAt,
  };
}

export interface AppointmentUpdateFormHandle {
  save: () => void;
}

export interface AppointmentUpdateFormProps {
  appointment: Appointment;
  timezone: string;
  currencyCode?: string;
  updatedBy?: string | null;
  canViewHistory?: boolean;
  onSaved: () => void;
  onPendingChange?: (pending: boolean) => void;
  onHeaderDateChange?: (label: string) => void;
  onMessageClick?: (contactId: string) => void;
}

export const AppointmentUpdateForm = forwardRef<
  AppointmentUpdateFormHandle,
  AppointmentUpdateFormProps
>(function AppointmentUpdateForm(
  {
    appointment,
    timezone,
    currencyCode = "USD",
    updatedBy = null,
    canViewHistory = false,
    onSaved,
    onPendingChange,
    onHeaderDateChange,
    onMessageClick,
  },
  ref,
) {
  const queryClient = useQueryClient();

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
  });

  const selectedCalendar = useMemo(
    () =>
      calendars?.items.find((calendar) => calendar.id === appointment.calendarId),
    [calendars?.items, appointment.calendarId],
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
    appointment.assignedToId ?? staffOptions[0]?.userId ?? "";

  const [contactId, setContactId] = useState(appointment.contactId ?? "");
  const [contactLabel, setContactLabel] = useState(
    getContactDisplayName(appointment.contact),
  );
  const [pickedContact, setPickedContact] = useState<Contact | null>(null);
  const [dateKey, setDateKey] = useState("");
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [services, setServices] = useState<AppointmentServiceLineSelection[]>(
    [],
  );
  const [notes, setNotes] = useState(appointment.notes ?? "");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [servicePickerOpen, setServicePickerOpen] = useState(false);

  useEffect(() => {
    const schedule = scheduleFromUtcIso(
      appointment.startAt,
      appointment.endAt,
      timezone,
    );
    setContactId(appointment.contactId ?? "");
    setContactLabel(getContactDisplayName(appointment.contact));
    setPickedContact(null);
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
    setNotesOpen(false);
    setDraftNotes("");
  }, [appointment, timezone, defaultAssignedToId]);

  const mutation = useMutation({
    mutationFn: () => {
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
      onSaved();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not update appointment",
      );
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      save: () => mutation.mutate(),
    }),
    [mutation],
  );

  useEffect(() => {
    onPendingChange?.(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);

  const headerDateLabel = useMemo(() => {
    if (!dateKey) return "";
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return date
      .toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();
  }, [dateKey]);

  useEffect(() => {
    onHeaderDateChange?.(headerDateLabel);
  }, [headerDateLabel, onHeaderDateChange]);

  const clientCardContact = pickedContact
    ? contactToClientCard(pickedContact)
    : appointment.contact && contactId === appointment.contact.id
      ? appointment.contact
      : null;

  const hasFilledServices = services.length > 0;

  const handleContactSelect = (contact: Contact) => {
    setContactLabel(contact.label);
    setPickedContact(contact);
  };

  const handleStartMinutesChange = (minutes: number) => {
    setStartMinutes(minutes);
    setServices((current) => rechainAllServiceLines(current, minutes));
  };

  const handleAddService = (service: Service) => {
    const nextStartMinutes = getChainedStartMinutes(
      services,
      services.length,
      startMinutes,
    );
    const assignedToId =
      services[services.length - 1]?.assignedToId || defaultAssignedToId;
    setServices((current) => [
      ...current,
      serviceToLineSelection(service, {
        assignedToId,
        startMinutes: nextStartMinutes,
      }),
    ]);
  };

  const openNotesEditor = () => {
    setDraftNotes(notes);
    setNotesOpen(true);
  };

  const confirmNotes = () => {
    setNotes(draftNotes.trim());
    setNotesOpen(false);
    setDraftNotes("");
  };

  const cancelNotes = () => {
    setNotesOpen(false);
    setDraftNotes("");
  };

  return (
    <DrawerFormFields>
      <AppointmentDateTimeFields
        dateKey={dateKey}
        startMinutes={startMinutes}
        slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
        onDateChange={setDateKey}
        onStartMinutesChange={handleStartMinutesChange}
      />

      {clientCardContact ? (
        <AppointmentClientCard
          contact={clientCardContact}
          onRemove={() => {
            setContactId("");
            setContactLabel("");
            setPickedContact(null);
          }}
          onAddCreditCard={() =>
            toast.message("Open the client profile to add a payment method")
          }
          onMessageClick={
            onMessageClick && contactId
              ? () => onMessageClick(contactId)
              : undefined
          }
        />
      ) : (
        <DrawerFormFieldGroup label="Client">
          <ContactPicker
            value={contactId}
            onValueChange={(id) => {
              setContactId(id);
              if (!id) {
                setPickedContact(null);
                setContactLabel("");
              }
            }}
            onContactSelect={handleContactSelect}
            placeholder="Search or create a client"
            variant="drawer"
          />
        </DrawerFormFieldGroup>
      )}

      {hasFilledServices ? (
        <AppointmentServiceLineEditor
          value={services}
          onChange={setServices}
          staffOptions={staffOptions}
          defaultAssignedToId={defaultAssignedToId}
          appointmentStartMinutes={startMinutes}
          onAppointmentStartMinutesChange={handleStartMinutesChange}
          slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
          currencyCode={currencyCode}
          variant="drawer"
          filledDisplay
          pickerOpen={servicePickerOpen}
          onPickerOpenChange={setServicePickerOpen}
        />
      ) : (
        <DrawerFormFieldGroup label="Service">
          <AppointmentServiceLineEditor
            value={services}
            onChange={setServices}
            staffOptions={staffOptions}
            defaultAssignedToId={defaultAssignedToId}
            appointmentStartMinutes={startMinutes}
            onAppointmentStartMinutesChange={handleStartMinutesChange}
            slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
            currencyCode={currencyCode}
            variant="drawer"
            filledDisplay
          />
        </DrawerFormFieldGroup>
      )}

      <DrawerItemAddLayout
        items={
          !notesOpen && notes.trim() ? (
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a description to the client"
              rows={3}
              maxLength={NOTES_MAX_LENGTH}
              className={cn(
                APPOINTMENT_DRAWER_FIELD_CLASS,
                "min-h-[88px] resize-none py-3",
              )}
            />
          ) : null
        }
        editor={
          <>
            {servicePickerOpen && hasFilledServices ? (
              <AppointmentServiceCombobox
                excludedIds={services.map((line) => line.serviceId)}
                onAdd={(service) => {
                  handleAddService(service);
                  setServicePickerOpen(false);
                }}
                currencyCode={currencyCode}
                placeholder="Search services…"
                triggerClassName={cn(
                  APPOINTMENT_DRAWER_FIELD_CLASS,
                  "font-normal",
                )}
                defaultOpen
              />
            ) : null}
            {notesOpen ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={draftNotes}
                onChange={(event) => setDraftNotes(event.target.value)}
                placeholder="Add a description to the client"
                rows={3}
                maxLength={NOTES_MAX_LENGTH}
                className={cn(
                  APPOINTMENT_DRAWER_FIELD_CLASS,
                  "min-h-[88px] resize-none py-3",
                )}
              />
              <div className="flex items-center justify-end gap-2">
                <ActionButton
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 min-w-[72px] px-4"
                  onClick={cancelNotes}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="button"
                  size="sm"
                  className="h-9 min-w-[72px] border-0 bg-violet-primary-normal px-4 text-white hover:bg-violet-primary-normal-hover"
                  onClick={confirmNotes}
                >
                  Add
                </ActionButton>
              </div>
            </div>
            ) : null}
          </>
        }
        actions={
          hasFilledServices ? (
            <div className="flex flex-wrap items-center gap-6">
              <AppointmentServicePicker
                open={servicePickerOpen}
                onOpenChange={setServicePickerOpen}
                value={services}
                currencyCode={currencyCode}
                onAdd={handleAddService}
                trigger={
                  <button
                    type="button"
                    className={APPOINTMENT_DRAWER_ADD_ACTION_CLASS}
                  >
                    Add Service
                  </button>
                }
              />
              {!notesOpen ? (
                <DrawerAddAction label="Add Note" onClick={openNotesEditor} />
              ) : null}
            </div>
          ) : !notesOpen ? (
            <DrawerAddAction label="Add Note" onClick={openNotesEditor} />
          ) : null
        }
      />

      <DrawerCheckboxRow
        id="edit-send-confirmation"
        label="Send confirmation to the client"
        checked={sendConfirmation}
        onCheckedChange={setSendConfirmation}
      />

      {canViewHistory ? (
        <AppointmentBookingDetails
          createdAt={appointment.createdAt}
          updatedAt={appointment.updatedAt}
          createdBy={appointment.createdBy}
          updatedBy={updatedBy}
          timezone={timezone}
          defaultOpen={false}
        />
      ) : null}
    </DrawerFormFields>
  );
});
